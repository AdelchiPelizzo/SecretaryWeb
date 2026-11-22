
(function () {
    "use strict";

    const TRACKING_ENDPOINT = "/api/visitor-tracking";

    const visitId = window.secretaryVisitId;

    if (!visitId) {
        return;
    }

    const trackingData = {
        visitId: visitId,
        javascriptConfirmed: true,
        preferredLanguages: Array.isArray(navigator.languages)
            ? navigator.languages
            : [navigator.language || "unknown"],
        activeSeconds: 0,
        maxScrollPercent: 0,
        viewedSections: []
    };

    // Track meaningful activity in the visible browser tab.
    let lastActivity = Date.now();
    let lastUpdate = Date.now();
    let activeMilliseconds = 0;

    const IDLE_TIMEOUT = 30000;

    function recordActivity() {
        lastActivity = Date.now();
    }

    [
        "mousemove",
        "mousedown",
        "keydown",
        "scroll",
        "touchstart",
        "pointerdown"
    ].forEach(function (eventName) {
        document.addEventListener(eventName, recordActivity, {
            passive: true
        });
    });

    function updateActiveTime() {
        const now = Date.now();

        if (document.visibilityState === "visible") {
            const activityWindowStart = Math.max(
                lastUpdate,
                lastActivity
            );

            const activityWindowEnd = Math.min(
                now,
                lastActivity + IDLE_TIMEOUT
            );

            if (activityWindowEnd > activityWindowStart) {
                activeMilliseconds +=
                    activityWindowEnd - activityWindowStart;
            }
        }

        lastUpdate = now;

        trackingData.activeSeconds = Math.floor(
            activeMilliseconds / 1000
        );
    }

    document.addEventListener("visibilitychange", function () {
        updateActiveTime();
    });

    // Track maximum scroll depth.
    function updateScrollDepth() {
        const documentHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const scrollableHeight = documentHeight - viewportHeight;

        if (scrollableHeight <= 0) {
            return;
        }

        const scrollPercent = Math.round(
            (window.scrollY / scrollableHeight) * 100
        );

        trackingData.maxScrollPercent = Math.max(
            trackingData.maxScrollPercent,
            Math.min(scrollPercent, 100)
        );
    }

    window.addEventListener("scroll", updateScrollDepth, {
        passive: true
    });

    window.addEventListener("resize", updateScrollDepth);

    // Record sections that enter the visitor's viewport.
    const sectionIds = [
        "features",
        "pricing",
        "personalities",
        "how-it-works",
        "contact"
    ];

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;

                    if (!trackingData.viewedSections.includes(sectionId)) {
                        trackingData.viewedSections.push(sectionId);
                    }
                }
            });
        }, {
            threshold: 0.25
        });

        sectionIds.forEach(function (sectionId) {
            const section = document.getElementById(sectionId);

            if (section) {
                observer.observe(section);
            }
        });
    }

    // Send collected information to the server.
    function sendTrackingData(useBeacon) {
        updateActiveTime();
        updateScrollDepth();

        const payload = JSON.stringify(trackingData);

        if (useBeacon && navigator.sendBeacon) {
            const blob = new Blob([payload], {
                type: "application/json"
            });

            navigator.sendBeacon(TRACKING_ENDPOINT, blob);
            return;
        }

        fetch(TRACKING_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: payload,
            keepalive: true
        }).catch(function () {
            // Tracking must never interfere with the website.
        });
    }

    // Initial confirmation and periodic updates.
    sendTrackingData(false);

    setInterval(function () {
        sendTrackingData(false);
    }, 15000);

    // Final update when the visitor leaves the page.
    window.addEventListener("pagehide", function () {
        sendTrackingData(true);
    });

})();
