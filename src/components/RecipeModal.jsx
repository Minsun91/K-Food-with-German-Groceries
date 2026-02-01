import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../utils/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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
    isSaving,
}) => {
    const [justSavedId, setJustSavedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    // const [editData, setEditData] = useState({ ...recipe });
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(recipe.imageUrl || null);
    const [isUpdating, setIsUpdating] = useState(false); // 수정 중 로딩 상태
    const [communityFiles, setCommunityFiles] = useState([]); // 파일들
    const [communityPreviews, setCommunityPreviews] = useState([]); // 미리보기들

    const isOwner = recipe.userId === userId;
    if (!recipe) return null;

    const displayName =
        editData[`name_${currentLang}`] || editData.name_ko || editData.name;
    const displayIngredients =
        editData[`ingredients_${currentLang}`] ||
        editData.ingredients_ko ||
        editData.ingredients ||
        [];

    const MARKET_URLS = {
        rewe: "https://shop.rewe.de/auswahl?search=",
        lidl: "https://www.lidl.de/s/?q=",
        edeka: "https://www.edeka.de/suche.htm?query=",
        aldi: "https://www.aldi-sued.de/de/suche.html?q=",
    };

    useEffect(() => {
    if (recipe) {
        console.log("원본 레시피 데이터:", recipe);
        setEditData({
            ...recipe,
            steps_ko: recipe.steps_ko || [],
            steps_de: recipe.steps_de || [],
            steps_en: recipe.steps_en || [],
            name_ko: recipe.name_ko || "",
            ingredients: recipe.ingredients || ""
        });
    }
}, [recipe?.id]);

// 수정 중일 때는 editData를, 아닐 때는 원본 recipe를 사용
const displaySteps = isEditing 
    ? (editData?.[`steps_${currentLang}`] || []) 
    : (recipe?.[`steps_${currentLang}`] || []);

    if (!recipe) return null;

    const handlePhotosSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setCommunityFiles((prev) => [...prev, ...files]);
            const newPreviews = files.map((file) => URL.createObjectURL(file));
            setCommunityPreviews((prev) => [...prev, ...newPreviews]);
        }
    };

    // 사용자가 미리보기를 보고 "저장"을 눌렀을 때만 실행
    const handleUploadConfirm = async () => {
        if (communityFiles.length === 0) return;

        try {
            setIsUpdating(true);
            const uploadedUrls = [];

            // 1. 여러 장의 사진을 Storage에 순차적 업로드
            for (const file of communityFiles) {
                const storageRef = ref(
                    storage,
                    `community/${recipe.id}_${Date.now()}_${file.name}`,
                );
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                uploadedUrls.push(url);
            }

            // 2. Firestore 'posts' 컬렉션에 데이터 기록
            await addDoc(collection(db, "posts"), {
                content: `📸 ${recipe.name_ko || recipe.name_en} 요리 인증샷!`,
                imageUrls: uploadedUrls, // 배열로 저장
                authorName: editData.authorName || "User", // 사용자 정보가 있다면 연결
                authorId: userId,
                createdAt: serverTimestamp(),
                recipeId: recipe.id,
            });

            alert("커뮤니티에 등록되었습니다! 커뮤니티로 이동합니다. 🎉");

            // 3. 커뮤니티 탭으로 바로 이동 (내비게이션 함수가 있다면 사용)
            // 만약 단순 탭 전환 방식이라면 부모로부터 받은 함수를 호출하세요.
            if (typeof onTabChange === "function") {
                onTabChange("community"); // 'community'는 실제 탭 ID
            }
            if (window.location.hash) window.location.hash = "#community";
            onClose(); // 모달 닫기
        } catch (error) {
            alert("업로드 실패: " + error.message);
        } finally {
            setIsUpdating(false);
        }
    };

    // 수정 완료 핸들러 (부모 알림과 중복되지 않도록 alert 제거)
    const handleUpdate = async () => {
        try {
            setIsUpdating(true);
            // 사진 파일(imageFile)이 있더라도 여기서는 처리하지 않고 텍스트만 보냅니다.
            await onUpdateRecipe(recipe.id, {
                ...editData, // 수정된 이름, 재료 등만 전달
            });
            setIsEditing(false);
            // 성공 알림은 부모나 여기서 한 번만! (부모에서 alert을 띄운다면 여기서는 삭제)
        } catch (error) {
            console.error("수정 실패:", error);
        } finally {
            setIsUpdating(false);
        }
    };
    // 수정 완료 핸들러
    const handleUpdateTextOnly = async () => {
        try {
            setIsUpdating(true); // 로딩 시작
            await onUpdateRecipe(recipe.id, {
                ...editData,
            });
            setIsEditing(false);
            alert("레시피가 수정되었습니다!");
        } catch (error) {
            alert("수정 실패: " + error.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCommunityPhotoUpload = async (e) => {
        if (!userId) {
            alert("로그인 후 커뮤니티에 사진을 올릴 수 있어요! 🔑");
            return;
        }

        const file = e.target.files[0];
        if (!file) return;

        try {
            setIsUpdating(true);
            // Storage 업로드 로직 실행 (아까 만든 CORS 설정 덕분에 이제 잘 될 거예요!)
            const storageRef = ref(
                storage,
                `community/${recipe.id}_${Date.now()}`,
            );
            await uploadBytes(storageRef, file);
            const photoUrl = await getDownloadURL(storageRef);

            // 여기서 커뮤니티 컬렉션에 새 글을 저장하거나,
            // 기존 레시피에 '인증샷' 필드로 추가하는 로직 실행
            alert("커뮤니티에 사진이 등록되었습니다! 🥳");
        } catch (error) {
            alert("사진 등록 실패: " + error.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const onInternalSave = async () => {
        try {
            const savedResult = await handleSaveRecipe(editData);

            if (savedResult && savedResult.id) {
                setJustSavedId(savedResult.id);
                alert("저장되었습니다!");
            }
        } catch (error) {
            console.error("저장 중 오류 발생:", error);
            alert("저장 실패");
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}>
            <div
                className="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}>
                <div className="overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                    {isEditing ? (
                        // ✏️ [수정 모드] 텍스트만 깔끔하게 수정!
                        <div className="space-y-4 animate-in fade-in">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400">
                                    Recipe Name
                                </label>
                                <input
                                    value={editData.name_ko}
                                    onChange={(e) =>
                                        setEditData({
                                            ...editData,
                                            name_ko: e.target.value,
                                        })
                                    }
                                    className="w-full p-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
{displaySteps.map((step, idx) => (
    <div key={idx} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">
            {idx + 1}
        </span>
        {isEditing ? (
            <textarea
                value={typeof step === "object" ? step.text : step}
                onChange={(e) => {
                    const fieldName = `steps_${currentLang}`; // 예: steps_ko
                    const newSteps = [...(editData[fieldName] || [])];
                    
                    if (typeof newSteps[idx] === "object") {
                        newSteps[idx] = { ...newSteps[idx], text: e.target.value };
                    } else {
                        newSteps[idx] = e.target.value;
                    }
                    
                    setEditData({ ...editData, [fieldName]: newSteps });
                }}
                className="w-full p-2 bg-slate-50 rounded-lg text-sm min-h-[60px] outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
        ) : (
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                {typeof step === "object" ? step.text : step}
            </p>
        )}
    </div>
))}
                            {/* 사진 변경 <input>이나 <img> 태그가 여기에 있다면 모두 삭제하세요! */}

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400">
                                    Ingredients
                                </label>
                                <textarea
                                    value={editData.ingredients}
                                    onChange={(e) =>
                                        setEditData({
                                            ...editData,
                                            ingredients: e.target.value,
                                        })
                                    }
                                    className="w-full p-4 bg-slate-50 rounded-xl min-h-[100px]"
                                />
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={handleUpdate}
                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black">
                                    {isUpdating ? "Saving..." : "수정 완료"}
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-4 bg-slate-100 text-slate-400 rounded-2xl font-bold">
                                    취소
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* --- [보기 모드] --- */
                        <>
                            {" "}
                            {recipe.imageUrl && (
                                <img
                                    src={recipe.imageUrl}
                                    className="w-full aspect-video object-cover rounded-[2rem] mb-8 shadow-sm"
                                    alt="Food"
                                />
                            )}
                            <h2 className="text-2xl sm:text-4xl font-black text-slate-800 mb-8 leading-tight break-words pr-8">
                                {displayName}
                            </h2>
                            <div className="space-y-10">
                                <div>
                                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                                        🛒{" "}
                                        {currentLang === "ko"
                                            ? "재료 및 마트 검색"
                                            : currentLang === "de"
                                              ? "Zutaten & Suche"
                                              : "Ingredients & Search"}
                                    </h3>
                                    <div className="grid gap-3">
                                        {displayIngredients.map((item, idx) => {
                                            const itemName =
                                                typeof item === "object"
                                                    ? item.item || item.name
                                                    : item;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                                                    <span className="font-medium text-slate-700">
                                                        {itemName}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <a
                                                            href={`${MARKET_URLS.rewe}${encodeURIComponent(itemName)}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="px-3 py-1.5 text-[11px] font-bold bg-[#CC0000] text-white rounded-lg hover:opacity-80 transition-opacity">
                                                            REWE
                                                        </a>
                                                        <a
                                                            href={`${MARKET_URLS.lidl}${encodeURIComponent(itemName)}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="px-3 py-1.5 text-[11px] font-bold bg-[#0050AA] text-white rounded-lg hover:opacity-80 transition-opacity">
                                                            Lidl
                                                        </a>
                                                        <a
                                                            href={`${MARKET_URLS.edeka}${encodeURIComponent(itemName)}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="px-3 py-1.5 text-[11px] font-bold bg-[#FFD400] text-[#003051] rounded-lg hover:opacity-80 transition-opacity">
                                                            EDEKA
                                                        </a>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                                        🍳{" "}
                                        {currentLang === "ko"
                                            ? "조리 순서"
                                            : currentLang === "de"
                                              ? "Schritte"
                                              : "Steps"}
                                    </h3>
                                    <div className="space-y-4">
                                        {displaySteps.map((step, idx) => (
                                            <div
                                                key={idx}
                                                className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">
                                                    {idx + 1}
                                                </span>
                                                <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                                                    {typeof step === "object"
                                                        ? step.text
                                                        : step}
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
                                        className={`w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-lg ${isSaving ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.01]"}`}>
                                        {isSaving
                                            ? currentLang === "ko"
                                                ? "⏳ 레시피 저장 중..."
                                                : "⏳ Speichern..."
                                            : `📌 ${currentLang === "ko" ? "저장하기" : "In Community speichern"}`}
                                    </button>
                                )}

                                {justSavedId && (
                                    <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold text-center border-2 border-dashed border-emerald-200 animate-in fade-in zoom-in duration-300">
                                        ✅{" "}
                                        {currentLang === "ko"
                                            ? "저장이 완료되었습니다!"
                                            : "Gespeichert!"}
                                    </div>
                                )}

                                {/* 상단 버튼: 수정하기만 남김 */}
                                <div className="mt-8 space-y-6">
                                    <div className="flex flex-col gap-3">
                                        {communityPreviews.length === 0 ? (
                                            <div className="relative">
                                                <button className="w-full py-4 bg-orange-50 text-orange-600 border border-orange-200 rounded-2xl font-black flex items-center justify-center gap-2 shadow-sm">
                                                    <span>📸</span>
                                                    {currentLang === "ko"
                                                        ? "실제 요리 사진 인증"
                                                        : "Post Cooking Photo"}
                                                </button>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple // 여러 장 선택 가능하게 추가
                                                    disabled={!userId}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={
                                                        handlePhotosSelect
                                                    }
                                                />
                                            </div>
                                        ) : (
                                            /* 🖼️ 여러 사진 미리보기 영역 */
                                            <div className="space-y-4 p-4 bg-orange-50 rounded-3xl border-2 border-orange-100">
                                                <div className="grid grid-cols-2 gap-2">
                                                    {communityPreviews.map(
                                                        (src, index) => (
                                                            <img
                                                                key={index}
                                                                src={src}
                                                                className="w-full h-32 object-cover rounded-xl shadow-sm"
                                                            />
                                                        ),
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={
                                                            handleUploadConfirm
                                                        }
                                                        disabled={isUpdating}
                                                        className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold active:scale-95 transition-all">
                                                        {isUpdating
                                                            ? "업로드 중..."
                                                            : currentLang ===
                                                                "ko"
                                                              ? "인증샷 올리기"
                                                              : "Confirm"}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setCommunityFiles(
                                                                [],
                                                            );
                                                            setCommunityPreviews(
                                                                [],
                                                            );
                                                        }}
                                                        className="px-4 py-3 bg-white text-slate-400 rounded-xl font-bold">
                                                        {currentLang === "ko"
                                                            ? "취소"
                                                            : "Cancel"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* ✏️ 레시피 내용 수정 (차분한 디자인) */}
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="w-full py-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
                                            <span>✏️</span>
                                            {currentLang === "ko"
                                                ? "레시피 내용 수정"
                                                : currentLang === "en"
                                                  ? "Edit Details"
                                                  : "Details bearbeiten"}
                                        </button>
                                    </div>

                                    {/* --- Section 2: 공유하기 (카드 스타일) --- */}
                                    <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                                        {recipe.id ? (
                                            <div className="space-y-3">
                                                <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                    Share with friends
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() =>
                                                            shareToKakao(
                                                                recipe,
                                                                currentLang,
                                                            )
                                                        }
                                                        className="flex-1 py-3 bg-[#FEE500] text-[#3A1D1D] rounded-xl text-[12px] font-black hover:brightness-95 transition-all flex items-center justify-center gap-1">
                                                        카카오톡
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            shareToWhatsApp(
                                                                recipe,
                                                                currentLang,
                                                            )
                                                        }
                                                        className="flex-1 py-3 bg-[#25D366] text-white rounded-xl text-[12px] font-black hover:brightness-95 transition-all flex items-center justify-center gap-1">
                                                        WhatsApp
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center py-2">
                                                <p className="text-[12px] font-bold text-slate-400 flex items-center gap-2">
                                                    <span className="grayscale">
                                                        💾
                                                    </span>
                                                    {currentLang === "ko"
                                                        ? "저장 후 공유가 가능합니다"
                                                        : "Save to enable sharing"}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* --- Section 3: 닫기 (하단 고정) --- */}
                                    <button
                                        onClick={onClose}
                                        className="w-full py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-all active:scale-95 underline underline-offset-4 decoration-slate-200">
                                        {currentLang === "ko"
                                            ? "닫기"
                                            : currentLang === "en"
                                              ? "Close"
                                              : "Schließen"}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecipeModal;
