import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../utils/firebase";

const RecipeModal = ({
    recipe,
    onClose,
    currentLang,
    shareToKakao,
    shareToWhatsApp,
    handleSaveRecipe,
    userId,
    onUpdateRecipe,
    isFromSaved,
    isSaving
}) => {
    const [justSavedId, setJustSavedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ ...recipe });
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(recipe.imageUrl || null);
    const [isUpdating, setIsUpdating] = useState(false); // 수정 중 로딩 상태

    const isOwner = recipe.userId === userId;
    if (!recipe) return null;

    const displayName = editData[`name_${currentLang}`] || editData.name_ko || editData.name;
    const displayIngredients = editData[`ingredients_${currentLang}`] || editData.ingredients_ko || editData.ingredients || [];
    const displaySteps = editData[`steps_${currentLang}`] || editData.steps_ko || editData.steps || [];

    const MARKET_URLS = {
        rewe: "https://shop.rewe.de/auswahl?search=",
        lidl: "https://www.lidl.de/s/?q=",
        edeka: "https://www.edeka.de/suche.htm?query=",
        aldi: "https://www.aldi-sued.de/de/suche.html?q="
    };

    // 이미지 변경 핸들러
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file)); // 미리보기 생성
        }
    };

    // 수정 완료 핸들러
    const handleUpdate = async () => {
        // 에러 방지용 체크
        if (typeof onUpdateRecipe !== 'function') {
            console.error("부모로부터 onUpdateRecipe 함수가 전달되지 않았습니다.");
            return;
        }

        try {
            let finalImageUrl = editData.imageUrl || "";
            if (imageFile) {
                const storageRef = ref(storage, `recipes/${recipe.id || Date.now()}`);
                await uploadBytes(storageRef, imageFile);
                finalImageUrl = await getDownloadURL(storageRef);
            }

            await onUpdateRecipe(recipe.id, { ...editData, imageUrl: finalImageUrl });
            setIsEditing(false);
            alert("수정 완료!");
        } catch (error) {
            alert("수정 중 에러 발생: " + error.message);
        }
    };

    const onInternalSave = async () => {
        try {
            const savedResult = await handleSaveRecipe(recipe);
            if (savedResult && savedResult.id) {
                setJustSavedId(savedResult.id);
            } else if (recipe.id) {
                setJustSavedId(recipe.id);
            }
        } catch (error) {
            console.error("저장 중 오류 발생:", error);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative" onClick={e => e.stopPropagation()}>
            
            <div className="overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                {/* 상단 버튼: 수정하기만 남김 */}
                <div className="mb-4 flex justify-end">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg"
                    >
                        {isEditing ? "❌ 취소" : "✏️ 수정하기"}
                    </button>
                </div>

                {isEditing ? (
                    /* --- [편집 모드] --- */
                    <div className="space-y-6">
                        <input 
                            className="w-full text-2xl font-black p-4 bg-slate-50 rounded-2xl border-2 border-indigo-100 outline-none"
                            value={editData[`name_${currentLang}`] || editData.name_ko || ""} 
                            onChange={e => setEditData({...editData, [`name_${currentLang}`]: e.target.value})}
                        />
                        <div className="relative aspect-video rounded-3xl bg-slate-100 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center">
                            {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <span className="text-slate-400 font-bold">📸 사진 변경</span>}
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                                const file = e.target.files[0];
                                if(file) { setImageFile(file); setPreviewUrl(URL.createObjectURL(file)); }
                            }} />
                        </div>
                        <button onClick={handleUpdate} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg">
                            완료
                        </button>
                    </div>
                ) : (
                    /* --- [보기 모드] --- */
                    <>                 {recipe.imageUrl && (
                                <img src={recipe.imageUrl} className="w-full aspect-video object-cover rounded-[2rem] mb-8 shadow-sm" alt="Food" />
                            )}

                            <h2 className="text-2xl sm:text-4xl font-black text-slate-800 mb-8 leading-tight break-words pr-8">
                                {displayName}
                            </h2>

                            <div className="space-y-10">
                                <div>
                                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                                        🛒 {currentLang === 'ko' ? '재료 및 마트 검색' : (currentLang === 'de' ? 'Zutaten & Suche' : 'Ingredients & Search')}
                                    </h3>
                                    <div className="grid gap-3">
                                        {displayIngredients.map((item, idx) => {
                                            const itemName = typeof item === 'object' ? (item.item || item.name) : item;
                                            return (
                                                <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                                                    <span className="font-medium text-slate-700">{itemName}</span>
                                                    <div className="flex gap-2">
                                                        <a href={`${MARKET_URLS.rewe}${encodeURIComponent(itemName)}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-[11px] font-bold bg-[#CC0000] text-white rounded-lg hover:opacity-80 transition-opacity">REWE</a>
                                                        <a href={`${MARKET_URLS.lidl}${encodeURIComponent(itemName)}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-[11px] font-bold bg-[#0050AA] text-white rounded-lg hover:opacity-80 transition-opacity">Lidl</a>
                                                        <a href={`${MARKET_URLS.edeka}${encodeURIComponent(itemName)}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-[11px] font-bold bg-[#FFD400] text-[#003051] rounded-lg hover:opacity-80 transition-opacity">EDEKA</a>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                                        🍳 {currentLang === 'ko' ? '조리 순서' : (currentLang === 'de' ? 'Schritte' : 'Steps')}
                                    </h3>
                                    <div className="space-y-4">
                                        {displaySteps.map((step, idx) => (
                                            <div key={idx} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">{idx + 1}</span>
                                                <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                                                    {typeof step === 'object' ? step.text : step}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 하단 버튼 영역 */}
                            <div className="mt-12 flex flex-col gap-4">
                                {/* 1. 저장 버튼 (필요할 때만 노출) */}
                                {!isFromSaved && !justSavedId && (
                                    <button
                                        onClick={onInternalSave}
                                        disabled={isSaving}
                                        className={`w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-lg ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
                                    >
                                        {isSaving
                                            ? (currentLang === 'ko' ? '⏳ 레시피 저장 중...' : '⏳ Speichern...')
                                            : `📌 ${currentLang === 'ko' ? '저장하기' : 'In Community speichern'}`}
                                    </button>
                                )}

                                {justSavedId && (
                                    <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold text-center border-2 border-dashed border-emerald-200 animate-in fade-in zoom-in duration-300">
                                        ✅ {currentLang === 'ko' ? '저장이 완료되었습니다!' : 'Gespeichert!'}
                                    </div>
                                )}

                                {/* 2. 공유 버튼 섹션 (가로 배치) */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={shareToWhatsApp}
                                        className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-md"
                                    >
                                        <span className="text-xl">💬</span> WhatsApp
                                    </button>

                                    <button
                                        onClick={shareToKakao}
                                        className="flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#FADA00] text-[#3c1e1e] py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-md"
                                    >
                                        <span className="text-xl">💛</span> Kakao
                                    </button>
                                </div>

                                {/* 3. ⭐ 여기에 닫기 버튼 추가! ⭐ */}
                                <button
                                    onClick={onClose}
                                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-5 rounded-2xl font-black text-base transition-all mt-2 active:scale-95"
                                >
                                    {currentLang === 'ko' ? '창 닫기' : 'Schließen'}
                                </button>
                            </div>             
                </>
                    )}
            </div>
        </div>
        </div >
    );
};

export default RecipeModal;