import React, { useEffect, useState } from 'react';

export default function FileScanner() {
    const [matches, setMatches] = useState([]);
    useEffect(() => {
        try {
            const files = import.meta.glob('/src/**/*.{js,jsx}', { query: '?raw', import: 'default', eager: true });
            const m = [];
            for (const [path, content] of Object.entries(files)) {
                if (typeof content === 'string' && (content.includes('demo') || content.includes('Demo') || content.includes('DEMO'))) {
                    m.push(path);
                }
            }
            setMatches(m);
        } catch (e) {
            setMatches(["ERROR: " + e.message]);
        }
    }, []);
    return <div style={{position: 'fixed', top: 0, left: 0, zIndex: 9999, background: 'white', padding: '10px', maxHeight: '100vh', overflow: 'auto', border: '2px solid red'}}>
        <h3>Demo Files:</h3>
        {matches.map(m => <div key={m}>{m}</div>)}
    </div>;
}