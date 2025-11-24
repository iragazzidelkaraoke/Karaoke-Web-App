/* ==========================================================
   SNOW EFFECT - ESTERNO E DISATTIVABILE
   ========================================================== */

(function () {
    const snowContainer = document.createElement("div");
    snowContainer.id = "snow-container";
    snowContainer.style.position = "fixed";
    snowContainer.style.top = "0";
    snowContainer.style.left = "0";
    snowContainer.style.width = "100%";
    snowContainer.style.height = "100%";
    snowContainer.style.pointerEvents = "none";
    snowContainer.style.overflow = "hidden";
    snowContainer.style.zIndex = "-2";
    document.body.appendChild(snowContainer);

    const NUM_FLAKES = 60;

    for (let i = 0; i < NUM_FLAKES; i++) {
        const flake = document.createElement("div");
        flake.classList.add("snowflake");
        flake.textContent = "❅"; // puoi cambiare in "❄" o "✦"
        snowContainer.appendChild(flake);
    }

    const style = document.createElement("style");
    style.innerHTML = `
        #snow-container .snowflake {
            position: absolute;
            top: -50px;
            color: white;
            font-size: 18px;
            opacity: 0.8;
            animation-name: fall;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
        }

        @keyframes fall {
            0% { transform: translateY(0px) rotate(0deg); }
            100% { transform: translateY(110vh) rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    // Impostiamo dimensioni e velocità random
    const flakes = document.querySelectorAll("#snow-container .snowflake");

    flakes.forEach((flake) => {
        const size = Math.random() * 18 + 10; // 10–28px
        const duration = Math.random() * 3 + 4; // 4–7s
        const delay = Math.random() * 5; // ritardo casuale

        flake.style.left = Math.random() * 100 + "%";
        flake.style.fontSize = size + "px";
        flake.style.animationDuration = duration + "s";
        flake.style.animationDelay = delay + "s";
    });
})();
