import React from 'react';

const BeautyGuide = ({ t, currentLang }) => {
    const recommendations = [
        { id: 1, name: "COSRX Snail Mucin", shop: "DM / Rossmann", tag: "Moisturizing" },
        { id: 2, name: "Beauty of Joseon Sunscreen", shop: "Online / Flaconi", tag: "Sun Care" },
        { id: 3, name: "Anua Heartleaf Toner", shop: "Douglas", tag: "Soothing" }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-5xl mx-auto">
            <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/40">
                <div className="mb-8">
                    <h2 className="text-2xl font-black text-slate-800">💄 {t?.beauty_title}</h2>
                    <p className="text-sm text-slate-400 font-medium mt-1">{t?.beauty_subtitle}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {recommendations.map(item => (
                        <div key={item.id} className="p-6 bg-slate-50 rounded-3xl border border-transparent hover:border-indigo-200 transition-all">
                            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded-full mb-3 uppercase">
                                {item.tag}
                            </span>
                            <h3 className="font-bold text-slate-800 mb-1">{item.name}</h3>
                            <p className="text-xs text-slate-500">Available at: <span className="font-bold text-indigo-500">{item.shop}</span></p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default BeautyGuide;