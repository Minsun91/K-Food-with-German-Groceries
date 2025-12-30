import React from 'react';

const GermanMartTips = ({ lang }) => {
  return (
    <div className="bg-white rounded-[2.5rem] p-8 mt-12 shadow-sm border border-gray-100">
      <h2 className="text-2xl font-black mb-6 text-indigo-600">
        {lang === 'ko' ? '🇩🇪 독일 마트 식재료 가이드' : '🇩🇪 Einkaufsführer für deutsche Supermärkte'}
      </h2>
      <div className="grid md:grid-cols-2 gap-8 text-slate-700">
        <section>
          <h3 className="font-bold text-lg mb-3 border-b pb-2">🛒 대체 식재료 (Ersatz)</h3>
          <ul className="space-y-2 text-sm">
            <li><b>삼겹살:</b> Schweinebauch (am Stück/in Scheiben)</li>
            <li><b>부침가루:</b> Weizenmehl 405 + Speisestärke</li>
            <li><b>숙주나물:</b> Mungobohnensprossen (Glas/Frisch)</li>
          </ul>
        </section>
        <section>
          <h3 className="font-bold text-lg mb-3 border-b pb-2">🥩 정육점 명칭 (Metzgerei)</h3>
          <ul className="space-y-2 text-sm">
            <li><b>불고기용:</b> Rinderoberschale (dünn geschnitten)</li>
            <li><b>목살:</b> Schweinenacken</li>
            <li><b>사태:</b> Rinderwade</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default GermanMartTips;