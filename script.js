// --- Setup State ---
let userFriends = []; // Will store the actual friends fetched

// DOM Elements
const screenSetup = document.getElementById("screen-setup");
const setupUsernameInput = document.getElementById("setup-username");
const setupDisplayNameInput = document.getElementById("setup-display-name");
const setupRobuxInput = document.getElementById("setup-robux");
const setupStartBtn = document.getElementById("setup-start-btn");
const setupStatus = document.getElementById("setup-status");

const friendsListContainer = document.getElementById("friends-list");
const screenFriends = document.getElementById("screen-friends");
const screenAmount = document.getElementById("screen-amount");
const screenLoading = document.getElementById("screen-loading");
const screenSuccess = document.getElementById("screen-success");

const modalFooter = document.getElementById("modal-footer");
const mainActionBtn = document.getElementById("main-action-btn");
const footerText = document.getElementById("footer-text");
const currentBalance = document.getElementById("current-balance");

const mainOverlay = document.getElementById("main-overlay");
const settingsBtn = document.getElementById("settings-trigger");
const fakeSendBtn = document.getElementById("fake-send-trigger");
const langBtn = document.getElementById("lang-trigger");
const robloxBg = document.getElementById("roblox-bg");

const selectedAvatar = document.getElementById("selected-avatar");
const selectedUsername = document.getElementById("selected-username");
const selectedAmountDisplay = document.getElementById("selected-amount");
const amountBtns = document.querySelectorAll(".amount-btn");

const sentAmountText = document.getElementById("sent-amount-text");
const sentUserText = document.getElementById("sent-user-text");
const closeBtn = document.querySelector(".close-btn");
const searchInput = document.querySelector(".search-container input");

// State
let selectedUser = null;
let selectedRobux = 200;
let currentPhase = "setup"; // setup, friends, amount, loading, success

// Initialize
function init() {
    setupAmountButtons();
    setupSearch();
    setupInitialScreen();
    
    // Toggle Language (Background)
    langBtn.addEventListener("click", () => {
        const currentBg = getComputedStyle(robloxBg).backgroundImage;
        if (currentBg.includes("Background_Spanish")) {
            robloxBg.style.backgroundImage = "url('Images/Background_English.png')";
        } else {
            robloxBg.style.backgroundImage = "url('Images/Background_Spanish.png')";
        }
    });

    // Open settings menu
    settingsBtn.addEventListener("click", () => {
        mainOverlay.classList.remove("hidden");
        
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) switchScreen(activeScreen, screenSetup);
        currentPhase = "setup";
        setupStatus.textContent = "";
        modalFooter.classList.add("hidden");
    });
    
    // Open real friend list from invisible send button
    fakeSendBtn.addEventListener("click", () => {
        mainOverlay.classList.remove("hidden");
        
        const activeScreen = document.querySelector('.screen.active');
        if (userFriends.length > 0) {
            // Setup already ran successfully
            if (activeScreen && activeScreen !== screenFriends) switchScreen(activeScreen, screenFriends);
            currentPhase = "friends";
            searchInput.value = "";
            renderFriends(userFriends);
            document.querySelector(".friends-heading").textContent = `My friends (${userFriends.length})`;
            modalFooter.classList.add("hidden");
        } else {
            // Setup never ran, go to setup
            if (activeScreen && activeScreen !== screenSetup) switchScreen(activeScreen, screenSetup);
            currentPhase = "setup";
            modalFooter.classList.add("hidden");
        }
    });

    mainActionBtn.addEventListener("click", handleActionClick);
    closeBtn.addEventListener("click", () => {
        // ALWAYS just close the modal completely when pressing X
        mainOverlay.classList.add("hidden");
    });
}

function setupInitialScreen() {
    setupStartBtn.addEventListener("click", async () => {
        const username = setupUsernameInput.value.trim();
        let displayName = setupDisplayNameInput.value.trim();
        const robux = parseInt(setupRobuxInput.value.trim()) || 0;

        if (!username) {
            setupStatus.textContent = "Please enter your username.";
            setupStatus.style.color = "#fca5a5";
            return;
        }

        if (!displayName) {
            displayName = username; // Fallback to username if Display Name is empty
        }

        setupStatus.textContent = "Loading friends... Please wait.";
        setupStatus.style.color = "#ccc";
        setupStartBtn.disabled = true;

        try {
            // 1. Hole User ID anhand des Namens per POST Request
            const userRes = await fetch("/api/roblox-usernames", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
            });

            if (!userRes.ok) throw new Error("Failed to get user");
            
            const userData = await userRes.json();
            if (!userData.data || userData.data.length === 0) {
                setupStatus.textContent = "User not found.";
                setupStatus.style.color = "#fca5a5";
                setupStartBtn.disabled = false;
                return;
            }

            const currentUserId = userData.data[0].id;

            // Fetch current user avatar
            const currentUserAvatarRes = await fetch(`https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${currentUserId}&size=150x150&format=Png&isCircular=true`);
            const currentUserAvatarData = await currentUserAvatarRes.json();
            const currentUserAvatarUrl = (currentUserAvatarData.data && currentUserAvatarData.data[0] && currentUserAvatarData.data[0].imageUrl) ? currentUserAvatarData.data[0].imageUrl : "Images/No_Picture.png";

            // 2. Fetch friends directly using the provided User ID
            const friendsRes = await fetch(`https://friends.rotunnel.com/v1/users/${currentUserId}/friends`);
            if (!friendsRes.ok) throw new Error("Failed to fetch friends");
            const friendsDataRes = await friendsRes.json();
            
            const friends = friendsDataRes.data || [];
            
            // Format friends and get avatars
            if (friends.length > 0) {
                const friendIds = friends.map(f => f.id);
                const friendIdsStr = friendIds.join(",");
                
                const avatarRes = await fetch(`https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${friendIdsStr}&size=150x150&format=Png&isCircular=true`);
                const avatarData = await avatarRes.json();
                
                // Get names through a single POST request
                const namesRes = await fetch("/api/roblox-users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userIds: friendIds, excludeBannedUsers: false })
                });
                const namesData = await namesRes.json();
                const usersInfos = namesData.data || [];
                
                userFriends = friends.map((friend) => {
                    const avatar = avatarData.data ? avatarData.data.find(a => a.targetId === friend.id) : null;
                    const userInfo = usersInfos.find(u => u.id === friend.id);
                    const realName = (userInfo && (userInfo.displayName || userInfo.name)) ? 
                                       (userInfo.displayName || userInfo.name) : "Unknown";

                    return {
                        name: realName,
                        img: (avatar && avatar.imageUrl) ? avatar.imageUrl : "Images/No_Picture.png"
                    };
                }).filter(friend => friend.name !== "Unknown");
            } else {
                userFriends = [];
            }

            // Update UI
            currentBalance.textContent = robux.toLocaleString('de-DE'); // Use format like 10.000
            
            // Update Background Mock UI
            document.getElementById("bg-nav-username").textContent = displayName;
            document.getElementById("bg-sidebar-username").textContent = displayName;
            
            let bgRobuxText = robux.toLocaleString('de-DE');
            if (robux >= 1000000) {
                bgRobuxText = Math.floor(robux / 1000000) + "M";
            } else if (robux >= 1000) {
                bgRobuxText = Math.floor(robux / 1000) + "K";
            }
            document.getElementById("bg-nav-robux").textContent = bgRobuxText;

            document.getElementById("nav-avatar").src = currentUserAvatarUrl;
            document.getElementById("sidebar-avatar").src = currentUserAvatarUrl;
            
            document.querySelector(".friends-heading").textContent = `My friends (${userFriends.length})`;
            renderFriends(userFriends);
            
            // Background is prepped. Hide the overlay entirely
            mainOverlay.classList.add("hidden");
            
            // Prepare for the next time the send button is clicked
            switchScreen(screenSetup, screenFriends);
            currentPhase = "friends";

        } catch (error) {
            console.error(error);
            setupStatus.textContent = "An error occurred. Try again.";
            setupStatus.style.color = "#fca5a5";
        }
        
        setupStartBtn.disabled = false;
    });
}

function renderFriends(friendsToRender = userFriends) {
    friendsListContainer.innerHTML = ""; // Clear existing friends

    if (friendsToRender.length === 0) {
        friendsListContainer.innerHTML = "<p style='color: #ccc; text-align: center; margin-top: 20px;'>User not found.</p>";
        return;
    }

    friendsToRender.forEach(friend => {
        const div = document.createElement("div");
        div.className = "friend-item";
        div.innerHTML = `
            <img src="${friend.img}" alt="${friend.name}" class="friend-avatar">
            <span class="friend-name">${friend.name}</span>
        `;
        div.addEventListener("click", () => selectFriend(friend));
        friendsListContainer.appendChild(div);
    });
}

function selectFriend(friend) {
    selectedUser = friend;
    selectedAvatar.src = friend.img;
    selectedUsername.textContent = friend.name;
    
    // Switch to amount screen
    switchScreen(screenFriends, screenAmount);
    
    // Show footer
    modalFooter.classList.remove("hidden");
    mainActionBtn.textContent = "Next";
    footerText.classList.remove("hidden");
    currentPhase = "amount";
}

function setupAmountButtons() {
    amountBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            amountBtns.forEach(b => b.classList.remove("active"));
            const currentBtn = e.currentTarget;
            currentBtn.classList.add("active");
            
            selectedRobux = parseInt(currentBtn.dataset.amount);
            selectedAmountDisplay.value = selectedRobux;
        });
    });

    selectedAmountDisplay.addEventListener("input", (e) => {
        amountBtns.forEach(b => b.classList.remove("active"));
        selectedRobux = parseInt(e.target.value) || 0;
    });
}

function switchScreen(oldScreen, newScreen) {
    oldScreen.classList.remove("active");
    oldScreen.classList.add("hidden");
    newScreen.classList.remove("hidden");
    newScreen.classList.add("active");
}

function handleActionClick() {
    if (currentPhase === "amount") {
        // Switch to loading
        switchScreen(screenAmount, screenLoading);
        modalFooter.classList.add("hidden"); // Hide footer during loading
        currentPhase = "loading";
        
        // Update balance display for realism during load
        const balanceNum = parseInt(currentBalance.textContent.replace(/\./g, ''));
        const newBalance = balanceNum - selectedRobux;
        
        setTimeout(() => {
            currentBalance.textContent = newBalance.toLocaleString('de-DE');
        }, 1500);

        // Simulate network request (3 seconds loading)
        setTimeout(() => {
            showSuccess();
        }, 3000);
    } 
    else if (currentPhase === "success") {
        // "Done" button clicked -> schließt das Modal, Friends-View vorbereiten
        mainOverlay.classList.add("hidden");
        
        switchScreen(screenSuccess, screenFriends);
        currentPhase = "friends";
        searchInput.value = "";
        renderFriends(userFriends);
        modalFooter.classList.add("hidden");
    }
}

function showSuccess() {
    switchScreen(screenLoading, screenSuccess);
    sentAmountText.textContent = selectedRobux.toLocaleString('de-DE');
    sentUserText.textContent = selectedUser.name;
    
    // Setup footer for success
    modalFooter.classList.remove("hidden");
    mainActionBtn.textContent = "Done";
    footerText.classList.add("hidden"); // Hide the small text
    currentPhase = "success";
}

// Start
init();

// --- Roblox API Search Logic ---

let searchTimeout;

function setupSearch() {
    searchInput.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        // Wenn das Feld leer ist, zeige wieder die Standard-Freunde
        if (query.length === 0) {
            renderFriends(userFriends);
            document.querySelector(".friends-heading").textContent = `My friends (${userFriends.length})`;
            return;
        }

        // Wir warten 1500ms nach der letzten Eingabe, bevor wir suchen (Rate-Limit & Performance)
        searchTimeout = setTimeout(async () => {
            document.querySelector(".friends-heading").textContent = "Searching...";
            friendsListContainer.innerHTML = "<p style='color: #ccc; text-align: center; margin-top: 20px;'>Searching for '" + query + "'...</p>";
            
            const users = await searchRobloxUser(query);
            
            if (users && users.error === 'rate_limit') {
                friendsListContainer.innerHTML = "<p style='color: #fca5a5; text-align: center; margin-top: 20px;'>Too many requests (Rate Limit). Please wait a moment.</p>";
                return;
            }

            if (users && users.length > 0) {
                renderFriends(users); // Suchergebnisse anzeigen
            } else {
                renderFriends([]); // Nichts gefunden
            }
        }, 1500);
    });
}

// Funktion zum Suchen von echten Roblox Benutzern
async function searchRobloxUser(username) {
    try {
        // Schritt 1: User anhand des Keywords suchen (via rotunnel)
        const userRes = await fetch(`https://users.rotunnel.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`);
        
        if (userRes.status === 429) {
            console.warn("API Rate Limit erreicht (Too many requests).");
            return { error: 'rate_limit' };
        }
        
        if (!userRes.ok) {
            console.error("Fehler bei der API Anfrage, Status:", userRes.status);
            return [];
        }

        const userData = await userRes.json();

        // Prüfen, ob Nutzer gefunden wurden
        if (!userData.data || userData.data.length === 0) {
            return [];
        }

        const users = userData.data.map(u => ({ id: u.id, name: u.name }));
        const userIds = users.map(u => u.id).join(",");

        // Schritt 2: Profilbilder (Headshot) anhand der IDs abfragen
        const avatarRes = await fetch(`https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${userIds}&size=150x150&format=Png&isCircular=true`);
        const avatarData = await avatarRes.json();

        if (avatarData.data && avatarData.data.length > 0) {
            return users.map(user => {
                const avatar = avatarData.data.find(a => a.targetId === user.id);
                return {
                    name: user.name,
                    img: avatar ? avatar.imageUrl : "https://ui-avatars.com/api/?name=" + user.name.charAt(0)
                };
            });
        }
    } catch (error) {
        console.error("Fehler bei der Roblox API Anfrage:", error);
    }
    
    return [];
}