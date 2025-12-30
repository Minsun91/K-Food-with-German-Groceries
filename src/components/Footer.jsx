import React from 'react';
import GermanMartTips from './GermanMartTips';

// src/components/Footer.jsx

const Footer = ({ currentLang, onOpenGuide }) => {
    return (
        <footer style={{
            marginTop: '80px',
            padding: '50px 20px',
            borderTop: '1px solid #f0f0f0',
            textAlign: 'center',
            backgroundColor: '#ffffff'
        }}>
            {/* 가이드 바로가기 버튼 섹션 */}
            <div style={{ marginBottom: '40px' }}>
                <h4 style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                    {currentLang === 'ko' ? '독일 생활에 도움이 되는 꿀팁' : 'Hilfreiche Tipps für das Leben in Deutschland'}
                </h4>
                <button 
                    onClick={onOpenGuide} // 이 함수는 App.jsx에서 넘겨받아 모달을 띄우거나 이동합니다
                    style={{
                        padding: '12px 24px',
                        borderRadius: '15px',
                        border: '1px solid #e0e0e0',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#4F46E5',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                >
                    🇩🇪 {currentLang === 'ko' ? '독일 마트 식재료 가이드 보기' : 'Einkaufsführer anzeigen'} →
                </button>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <strong style={{ fontSize: '16px' }}>Cook Korean, Anywhere 🌍🍜</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '13px' }}>
                <a href="/privacy.html" style={{ color: '#999', textDecoration: 'none' }}>Privacy Policy</a>
                <a href="/impressum.html" style={{ color: '#999', textDecoration: 'none' }}>Impressum</a>
            </div>
        </footer>
    );
};

export default Footer;