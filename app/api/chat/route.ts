
import { NextResponse } from 'next/server';

export const runtime = 'edge';

import { createClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // 1. Fetch Live Data from Supabase
        const supabase = await createClient();

        const [communitiesResult, eventsResult] = await Promise.all([
            supabase.from('communities').select('name, description').limit(10),
            supabase.from('events').select('title, date, location, description').limit(5)
        ]);

        const communities = communitiesResult.data || [];
        const events = eventsResult.data || [];

        // 2. Format Data for the AI
        let dataContext = "\n\n**CURRENT SITE DATA:**\n";

        if (communities.length > 0) {
            dataContext += "Active Communities:\n" + communities.map(c => `- ${c.name}: ${c.description || 'No description'}`).join('\n') + "\n";
        } else {
            dataContext += "Active Communities: None currently created.\n";
        }

        if (events.length > 0) {
            dataContext += "\nUpcoming Events:\n" + events.map(e => `- ${e.title} (${e.date}) at ${e.location}`).join('\n') + "\n";
        }

        if (!process.env.OPENROUTER_API_KEY) {
            return NextResponse.json(
                { error: 'Missing OpenRouter API Key' },
                { status: 500 }
            );
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://blue-testers.vercel.app',
                'X-Title': 'Blue Testers',
            },
            body: JSON.stringify({
                model: process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-7b-instruct',
                messages: [
                    {
                        content: `You are the AI Assistant for 'Blue Testers' (Unified Campus Resource & Event Manager). Your purpose is to help students and staff streamline campus activities, book resources, and collaborate. 

Features you know about:
- **Communities**: Students can join and create communities for interests/clubs (Dashboard > Communities).
- **General Chat**: A campus-wide chatroom for everyone.
- **Events**: Users can track and join campus events.
- **Resources**: Booking system for campus resources.

${dataContext}

Be helpful, friendly, and concise. If you don't know something, suggest checking the Dashboard.`
                    },
                    ...messages
                ],
                stream: true,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter API Error Status:", response.status);
            console.error("OpenRouter API Error Body:", errorText);
            return NextResponse.json(
                { error: `OpenRouter API Error: ${response.statusText}`, details: errorText },
                { status: response.status }
            );
        }

        // Transform the response into a readable stream
        const stream = new ReadableStream({
            async start(controller) {
                // @ts-ignore
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        // OpenRouter/OpenAI streams multiple "data: JSON" lines in one chunk sometimes
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                                try {
                                    const data = JSON.parse(line.slice(6));
                                    const content = data.choices[0]?.delta?.content || '';
                                    if (content) {
                                        controller.enqueue(new TextEncoder().encode(content));
                                    }
                                } catch (e) {
                                    // ignore parse errors for partial chunks
                                }
                            }
                        }
                    }
                } catch (error) {
                    controller.error(error);
                } finally {
                    controller.close();
                }
            },
        });

        return new NextResponse(stream);

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
