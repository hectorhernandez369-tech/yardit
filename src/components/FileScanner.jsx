import React, { useEffect } from 'react';

export default function FileScanner() {
    useEffect(() => {
        try {
            const files = import.meta.glob('/src/**/*.{js,jsx}', { query: '?raw', import: 'default', eager: true });
            const matches = [];
            for (const [path, content] of Object.entries(files)) {
                if (typeof content === 'string' && (content.includes('demo') || content.includes('Demo') || content.includes('DEMO'))) {
                    matches.push(path);
                }
            }
            console.log("DEMO_FILES_FOUND:", matches.join(", "));
        } catch (e) {
            console.error("SCANNER_ERROR:", e.message);
        }
    }, []);
    return <div data-testid="scanner-done">Scanning...</div>;
}