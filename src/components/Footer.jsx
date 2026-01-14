import React from 'react';
import GermanMartTips from './GermanMartTips';

// src/components/Footer.jsx

const Footer = ({ currentLang, onOpenGuide }) => {
    return (
      <footer className="w-full py-12 px-6 bg-gray-50 border-t border-gray-200 mt-20">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-6">
          
          {/* 가이드 버튼 섹션 */}
          <div className="space-y-2">
            <p className="text-sm text-gray-500 font-medium">독일 생활에 도움이 되는 꿀팁</p>
            <button 
              onClick={onOpenGuide}
              className="inline-flex items-center px-6 py-3 bg-white border border-indigo-100 shadow-sm rounded-full text-indigo-600 font-semibold hover:shadow-md transition-all active:scale-95"
            >
              <span className="mr-2">DE</span> 독일 마트 식재료 가이드 보기 →
            </button>
          </div>
  
          <hr className="w-16 border-gray-300" />
  
          {/* 브랜드 섹션 */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
              Cook Korean, Anywhere 🌍 🍜
            </h2>
            <div className="flex gap-4 justify-center text-xs text-gray-400 font-medium pt-4">
              <a href="/privacy.html" className="hover:text-gray-600">Privacy Policy</a>
              <span className="text-gray-200">|</span>
              <a href="/impressum.html" className="hover:text-gray-600">
  Impressum
</a>
            </div>
          </div>
        </div>
      </footer>
    );
  };

export default Footer;