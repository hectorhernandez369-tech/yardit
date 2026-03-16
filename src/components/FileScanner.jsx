import React, { useEffect, useState } from 'react';

export default function FileScanner() {
    useEffect(() => {
        try {
            const files = import.meta.glob('/src/**/*.{js,jsx}', { query: '?raw', import: 'default', eager: true });
            const m = [];
            for (const [path, content] of Object.entries(files)) {
                if (typeof content === 'string' && (content.includes('demo') || content.includes('Demo') || content.includes('DEMO'))) {
                    m.push(path);
                }
            }
            console.error("DEMO_MATCHES_FOUND", JSON.stringify(m));
        } catch (e) {
            console.error("DEMO_MATCHES_ERROR", e.message);
        }
    }, []);
    return null;
}