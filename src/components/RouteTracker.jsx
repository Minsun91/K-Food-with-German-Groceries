import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RouteTracker = () => {
    const location = useLocation();

    useEffect(() => {
        // gtag가 설정되어 있을 때만 실행 (index.html에 GA 스크립트가 있어야 함)
        if (window.gtag) {
            window.gtag('event', 'page_view', {
                page_path: location.pathname + location.search,
            });
        }
    }, [location]);

    return null; // 화면에 아무것도 그리지 않음
};

export default RouteTracker;