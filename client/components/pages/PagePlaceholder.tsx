import React from 'react';

interface PagePlaceholderProps {
    title: string;
}

export const PagePlaceholder: React.FC<PagePlaceholderProps> = ({ title }) => {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
            <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-300 tracking-tight">{title}</h1>
            <p className="mt-2 text-lg text-zinc-500">Content coming soon to this section!</p>
        </div>
    );
};
