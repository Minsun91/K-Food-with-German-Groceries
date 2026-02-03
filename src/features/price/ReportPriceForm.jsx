import React, { useState } from 'react';

const ReportPriceForm = ({ currentLang }) => {
    // 1. 번역 텍스트 설정
    const texts = {
        ko: {
            title: "가격 제보하기",
            desc: "더 저렴한 곳을 아신다면 알려주세요! 실시간으로 반영됩니다.",
            item: "품목 이름",
            item_ph: "예: 신라면, 리들샷 100",
            price: "가격 (€)",
            price_ph: "예: 1.50",
            store: "판매처",
            store_ph: "예: 다와요, 아마존, REWE 등",
            url: "참고 URL (선택)",
            submit: "제보 완료하기",
            alert: "제보가 완료되었습니다! 감사합니다."
        },
        en: {
            title: "Report a Price",
            desc: "Know a cheaper place? Let us know! We update in real-time.",
            item: "Item Name",
            item_ph: "e.g., Shin Ramyun, Reedle Shot",
            price: "Price (€)",
            price_ph: "e.g., 1.50",
            store: "Store",
            store_ph: "e.g., Amazon, Rewe, Dawayo",
            url: "Reference URL (Optional)",
            submit: "Submit Report",
            alert: "Thank you! Your report has been submitted."
        }
    };

    const t = texts[currentLang] || texts.ko; // 선택된 언어 가져오기
    const [status, setStatus] = useState(null); // 'sending', 'success', 'error'
    
    const [formData, setFormData] = useState({
        item: '',
        price: '',
        store: '',
        url: '',
        date: new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { 
            year: 'numeric', month: 'long', day: 'numeric' 
        })
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        alert(t.alert);
        console.log("Report Data:", formData);
        setFormData({ ...formData, item: '', price: '', store: '', url: '' });
    };

    return (
        <div className="w-full max-w-4xl mx-auto mt-12 mb-20 px-4">
            <div className="bg-[#FFFDF9] border-2 border-indigo-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">📝</div>

                <div className="relative z-10">
                    <div className="mb-8">
                        <h4 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
                            {t.title} <span className="text-xs bg-indigo-500 text-white px-2 py-1 rounded-lg animate-bounce">Beta</span>
                        </h4>
                        <p className="text-slate-500 text-sm font-medium">{t.desc}</p>
                        <div className="mt-3 text-[10px] font-bold text-indigo-400 uppercase tracking-widest italic">
                            Today: {formData.date}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-black text-slate-700 ml-1">{t.item}</label>
                            <input required type="text" placeholder={t.item_ph} value={formData.item}
                                onChange={(e) => setFormData({...formData, item: e.target.value})}
                                className="w-full px-5 py-3.5 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-black text-slate-700 ml-1">{t.price}</label>
                            <input required type="number" step="0.01" placeholder={t.price_ph} value={formData.price}
                                onChange={(e) => setFormData({...formData, price: e.target.value})}
                                className="w-full px-5 py-3.5 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-black text-slate-700 ml-1">{t.store}</label>
                            <input required type="text" placeholder={t.store_ph} value={formData.store}
                                onChange={(e) => setFormData({...formData, store: e.target.value})}
                                className="w-full px-5 py-3.5 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-black text-slate-700 ml-1">{t.url}</label>
                            <input type="url" placeholder="https://..." value={formData.url}
                                onChange={(e) => setFormData({...formData, url: e.target.value})}
                                className="w-full px-5 py-3.5 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm"
                            />
                        </div>

                        <div className="md:col-span-2 mt-4">
                            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-indigo-600 transition-all shadow-lg active:scale-[0.98]">
                                {t.submit}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ReportPriceForm;