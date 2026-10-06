// =========================================================
// STUDYAI
// PROFESSIONAL CHAT SCRIPT
// =========================================================

const chat =
    document.getElementById("chat");

const messageInput =
    document.getElementById("message");

const sendBtn =
    document.getElementById("sendBtn");

const fileInput =
    document.getElementById("fileInput");

const filePreview =
    document.getElementById("filePreview");

const chatHistory =
    document.getElementById("chatHistory");

const searchChats =
    document.getElementById("searchChats");


// =========================================================
// STATE
// =========================================================

let selectedFiles = [];

let currentChatId = null;

let currentMessages = [];


// =========================================================
// STORAGE KEY
// =========================================================

const STORAGE_KEY =
    "studyAIConversations";


// =========================================================
// START
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadChatHistory();

        setupInput();

        setupFileInput();

        setupDragAndDrop();

    }
);


// =========================================================
// INPUT
// =========================================================

function setupInput() {

    if (!messageInput) {
        return;
    }


    messageInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();

            }

        }
    );


    messageInput.addEventListener(
        "input",
        () => {

            messageInput.style.height =
                "auto";

            messageInput.style.height =
                Math.min(
                    messageInput.scrollHeight,
                    170
                ) + "px";

        }
    );

}


// =========================================================
// FILE INPUT
// =========================================================

function setupFileInput() {

    if (!fileInput) {
        return;
    }


    fileInput.addEventListener(
        "change",
        event => {

            addSelectedFiles(
                Array.from(
                    event.target.files
                )
            );

            fileInput.value = "";

        }
    );

}


// =========================================================
// OPEN FILE PICKER
// =========================================================

function openFilePicker(type) {

    if (!fileInput) {
        return;
    }


    if (type === "image") {

        fileInput.accept =
            "image/*";

    }

    else if (type === "audio") {

        fileInput.accept =
            "audio/*";

    }

    else if (type === "video") {

        fileInput.accept =
            "video/*";

    }

    else {

        fileInput.accept =
            ".pdf,.txt,.doc,.docx,.csv,.json,.py,.java,.js,.html,.css,.c,.cpp,.xlsx,.ppt,.pptx,image/*,audio/*,video/*";

    }


    fileInput.click();

}


// =========================================================
// ADD FILES
// =========================================================

function addSelectedFiles(files) {

    if (
        !files ||
        !files.length
    ) {
        return;
    }


    files.forEach(file => {

        const exists =
            selectedFiles.some(
                existing =>
                    existing.name === file.name &&
                    existing.size === file.size
            );


        if (!exists) {

            selectedFiles.push(file);

        }

    });


    showFilePreview();

}


// =========================================================
// FILE PREVIEW
// =========================================================

function showFilePreview() {

    if (!filePreview) {
        return;
    }


    filePreview.innerHTML = "";


    if (
        selectedFiles.length === 0
    ) {

        filePreview.style.display =
            "none";

        return;

    }


    filePreview.style.display =
        "flex";


    selectedFiles.forEach(
        (file, index) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "selected-file";


            let icon;


            if (
                file.type &&
                file.type.startsWith(
                    "image/"
                )
            ) {

                const url =
                    URL.createObjectURL(
                        file
                    );


                icon = `

                    <span
                        class="selected-file-icon"
                    >

                        <img
                            src="${url}"
                            alt=""
                        >

                    </span>

                `;

            }

            else {

                icon = `

                    <span
                        class="selected-file-icon"
                    >
                        ${getFileIcon(file)}
                    </span>

                `;

            }


            item.innerHTML = `

                ${icon}

                <span
                    class="selected-file-name"
                    title="${escapeHTML(file.name)}"
                >
                    ${escapeHTML(file.name)}
                </span>

                <button
                    class="remove-file"
                    type="button"
                    onclick="removeSelectedFile(${index})"
                >
                    ×
                </button>

            `;


            filePreview.appendChild(
                item
            );

        }
    );

}


// =========================================================
// REMOVE SELECTED FILE
// =========================================================

function removeSelectedFile(index) {

    selectedFiles.splice(
        index,
        1
    );

    showFilePreview();

}


// =========================================================
// SEND
// =========================================================

async function sendMessage() {

    const text =
        messageInput.value.trim();


    if (
        !text &&
        selectedFiles.length === 0
    ) {

        return;

    }


    const files =
        [...selectedFiles];


    // Create conversation
    if (!currentChatId) {

        currentChatId =
            Date.now();

        currentMessages = [];

    }


    // User message
    const userMessage = {

        role: "user",

        text: text,

        time:
            new Date().toISOString(),

        files:
            files.map(file => ({
                name: file.name,

                type: file.type,

                size: file.size
            }))

    };


    currentMessages.push(
        userMessage
    );


    addUserMessage(
        text,
        files
    );


    // Clear
    messageInput.value = "";

    messageInput.style.height =
        "auto";

    selectedFiles = [];

    showFilePreview();


    sendBtn.disabled = true;


    const typing =
        addTypingIndicator();


    try {

        const formData =
            new FormData();


        formData.append(
            "message",
            text
        );


        files.forEach(file => {

            formData.append(
                "files",
                file,
                file.name
            );

        });


        const response =
            await fetch(
                "/chat",
                {
                    method: "POST",

                    body: formData
                }
            );


        removeTypingIndicator(
            typing
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.response ||
                "Request failed"
            );

        }


        const answer =
            data.response ||
            "I could not generate a response.";


        addAIMessage(
            answer
        );


        // Save AI message
        currentMessages.push({

            role: "assistant",

            text: answer,

            time:
                new Date().toISOString()

        });


        saveCurrentConversation();


    }

    catch (error) {

        console.error(
            error
        );


        removeTypingIndicator(
            typing
        );


        addAIMessage(
            "Unable to connect to the chatbot server. Please make sure Flask is running."
        );

    }

    finally {

        sendBtn.disabled =
            false;

        messageInput.focus();

    }

}


// =========================================================
// USER MESSAGE
// =========================================================

function addUserMessage(
    text,
    files = []
) {

    removeWelcome();


    const row =
        document.createElement(
            "div"
        );


    row.className =
        "message-row user-row";


    let attachments = "";


    if (files.length) {

        attachments = `

            <div class="chat-file-list">

                ${files
                    .map(
                        file =>
                            createAttachmentHTML(
                                file
                            )
                    )
                    .join("")
                }

            </div>

        `;

    }


    const messageHTML =
        text
            ? `

                <div
                    class="message-bubble user-message"
                >
                    ${formatText(text)}
                </div>

              `
            : "";


    row.innerHTML = `

        <div class="message-content">

            ${attachments}

            ${messageHTML}

        </div>

    `;


    chat.appendChild(
        row
    );


    setupImagePreview(
        row
    );


    scrollToBottom();

}


// =========================================================
// ATTACHMENT HTML
// =========================================================

function createAttachmentHTML(file) {

    const name =
        escapeHTML(
            file.name
        );


    if (
        file.type &&
        file.type.startsWith(
            "image/"
        )
    ) {

        const url =
            URL.createObjectURL(
                file
            );


        return `

            <div
                class="chat-image-card"
            >

                <img
                    src="${url}"
                    class="chat-preview-image"
                    alt="${name}"
                >

                <div class="attachment-name">
                    ${name}
                </div>

            </div>

        `;

    }


    return `

        <div class="chat-file-card">

            <div class="chat-file-icon">

                ${getFileIcon(file)}

            </div>

            <div class="chat-file-details">

                <div
                    class="chat-file-name"
                    title="${name}"
                >
                    ${name}
                </div>

                <div class="chat-file-type">

                    ${getFileTypeName(file)}

                    ${formatFileSize(file.size)}

                </div>

            </div>

        </div>

    `;

}


// =========================================================
// AI MESSAGE
// =========================================================

function addAIMessage(text) {

    removeWelcome();


    const row =
        document.createElement(
            "div"
        );


    row.className =
        "message-row ai-row";


    row.innerHTML = `

        <div class="ai-avatar">
            ✦
        </div>

        <div class="message-content">

            <div
                class="message-bubble ai-message"
            >

                ${formatAIResponse(text)}

            </div>

        </div>

    `;


    chat.appendChild(
        row
    );


    addCopyButtons(
        row
    );


    scrollToBottom();

}


// =========================================================
// TYPING
// =========================================================

function addTypingIndicator() {

    const row =
        document.createElement(
            "div"
        );


    row.className =
        "message-row ai-row";


    row.innerHTML = `

        <div class="ai-avatar">
            ✦
        </div>

        <div class="message-content">

            <div
                class="message-bubble ai-message typing"
            >

                <span></span>
                <span></span>
                <span></span>

            </div>

        </div>

    `;


    chat.appendChild(
        row
    );


    scrollToBottom();


    return row;

}


function removeTypingIndicator(
    element
) {

    if (
        element &&
        element.parentNode
    ) {

        element.parentNode.removeChild(
            element
        );

    }

}


// =========================================================
// AI RESPONSE FORMAT
// =========================================================

function formatAIResponse(text) {

    if (!text) {
        return "";
    }


    let html =
        escapeHTML(text);


    html =
        html.replace(
            /```(\w+)?\n?([\s\S]*?)```/g,
            (match, language, code) => {

                const lang =
                    language ||
                    "code";


                return `

                    <div class="code-block">

                        <div class="code-header">

                            <span>
                                ${lang}
                            </span>

                            <button
                                type="button"
                                class="copy-code"
                            >
                                Copy
                            </button>

                        </div>

                        <pre><code>${code.trim()}</code></pre>

                    </div>

                `;

            }
        );


    html =
        html.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );


    html =
        html.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );


    html =
        html.replace(
            /^\s*[\*\-]\s+(.*)$/gm,
            "• $1"
        );


    html =
        html.replace(
            /\n/g,
            "<br>"
        );


    return html;

}


// =========================================================
// TEXT FORMAT
// =========================================================

function formatText(text) {

    return escapeHTML(text)
        .replace(
            /\n/g,
            "<br>"
        );

}


// =========================================================
// COPY CODE
// =========================================================

function addCopyButtons(
    container
) {

    const buttons =
        container.querySelectorAll(
            ".copy-code"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    const block =
                        button.closest(
                            ".code-block"
                        );


                    const code =
                        block.querySelector(
                            "code"
                        );


                    await navigator.clipboard.writeText(
                        code.innerText
                    );


                    button.textContent =
                        "Copied";


                    setTimeout(
                        () => {

                            button.textContent =
                                "Copy";

                        },
                        1500
                    );

                }
            );

        }
    );

}


// =========================================================
// IMAGE PREVIEW
// =========================================================

function setupImagePreview(
    container
) {

    const images =
        container.querySelectorAll(
            ".chat-preview-image"
        );


    images.forEach(
        image => {

            image.addEventListener(
                "click",
                () => {

                    const overlay =
                        document.createElement(
                            "div"
                        );


                    overlay.className =
                        "image-lightbox";


                    overlay.innerHTML = `

                        <button
                            type="button"
                            class="image-lightbox-close"
                        >
                            ×
                        </button>

                        <img
                            src="${image.src}"
                            alt="Image preview"
                        >

                    `;


                    document.body.appendChild(
                        overlay
                    );


                    overlay
                        .querySelector(
                            ".image-lightbox-close"
                        )
                        .onclick =
                            () => overlay.remove();


                    overlay.addEventListener(
                        "click",
                        event => {

                            if (
                                event.target ===
                                overlay
                            ) {

                                overlay.remove();

                            }

                        }
                    );

                }
            );

        }
    );

}


// =========================================================
// FILE ICON
// =========================================================

function getFileIcon(file) {

    const type =
        file.type || "";

    const name =
        file.name.toLowerCase();


    if (
        type.startsWith("image/")
    ) {
        return "IMG";
    }


    if (
        type.startsWith("audio/")
    ) {
        return "AUD";
    }


    if (
        type.startsWith("video/")
    ) {
        return "VID";
    }


    if (
        type ===
        "application/pdf"
    ) {
        return "PDF";
    }


    if (
        name.endsWith(".doc") ||
        name.endsWith(".docx")
    ) {
        return "DOC";
    }


    if (
        name.endsWith(".xls") ||
        name.endsWith(".xlsx")
    ) {
        return "XLS";
    }


    if (
        name.endsWith(".ppt") ||
        name.endsWith(".pptx")
    ) {
        return "PPT";
    }


    if (
        name.endsWith(".java") ||
        name.endsWith(".py") ||
        name.endsWith(".js") ||
        name.endsWith(".cpp") ||
        name.endsWith(".c")
    ) {
        return "CODE";
    }


    return "FILE";

}


// =========================================================
// FILE TYPE
// =========================================================

function getFileTypeName(file) {

    if (
        file.type.startsWith(
            "image/"
        )
    ) {
        return "Image";
    }


    if (
        file.type.startsWith(
            "audio/"
        )
    ) {
        return "Audio";
    }


    if (
        file.type.startsWith(
            "video/"
        )
    ) {
        return "Video";
    }


    if (
        file.type ===
        "application/pdf"
    ) {
        return "PDF";
    }


    return "File";

}


// =========================================================
// FILE SIZE
// =========================================================

function formatFileSize(
    bytes
) {

    if (!bytes) {
        return "";
    }


    if (bytes < 1024) {

        return `${bytes} B`;

    }


    if (
        bytes <
        1024 * 1024
    ) {

        return (
            Math.round(
                bytes / 1024
            ) +
            " KB"
        );

    }


    return (
        (
            bytes /
            (1024 * 1024)
        ).toFixed(1) +
        " MB"
    );

}


// =========================================================
// NEW CHAT
// =========================================================

function createNewChat() {

    currentChatId =
        null;

    currentMessages =
        [];


    selectedFiles =
        [];


    showFilePreview();


    chat.innerHTML = `

        <div
            class="welcome"
            id="welcome"
        >

            <div class="welcome-logo">
                ✦
            </div>

            <h2>
                How can I help you today?
            </h2>

            <p>
                Ask questions, solve coding problems,
                study your subjects, analyze files,
                or ask me anything.
            </p>

            <div class="suggestions">

                <button
                    type="button"
                    onclick="setQuestion('Explain Data Structures in simple language')"
                >

                    <span class="suggestion-icon">
                        📚
                    </span>

                    <span class="suggestion-content">

                        <strong>
                            Data Structures
                        </strong>

                        <small>
                            Learn concepts simply
                        </small>

                    </span>

                </button>


                <button
                    type="button"
                    onclick="setQuestion('What is Artificial Intelligence?')"
                >

                    <span class="suggestion-icon">
                        🧠
                    </span>

                    <span class="suggestion-content">

                        <strong>
                            Artificial Intelligence
                        </strong>

                        <small>
                            Understand AI basics
                        </small>

                    </span>

                </button>


                <button
                    type="button"
                    onclick="setQuestion('Give me Java practice questions')"
                >

                    <span class="suggestion-icon">
                        💻
                    </span>

                    <span class="suggestion-content">

                        <strong>
                            Java Practice
                        </strong>

                        <small>
                            Practice coding
                        </small>

                    </span>

                </button>


                <button
                    type="button"
                    onclick="setQuestion('Explain Computer Networks')"
                >

                    <span class="suggestion-icon">
                        🌐
                    </span>

                    <span class="suggestion-content">

                        <strong>
                            Computer Networks
                        </strong>

                        <small>
                            Learn CN concepts
                        </small>

                    </span>

                </button>

            </div>

        </div>

    `;


    messageInput.value =
        "";


    messageInput.style.height =
        "auto";


    messageInput.focus();


    loadChatHistory();

}


// =========================================================
// SET QUESTION
// =========================================================

function setQuestion(
    question
) {

    messageInput.value =
        question;


    messageInput.focus();


    messageInput.dispatchEvent(
        new Event("input")
    );

}


// =========================================================
// STORAGE
// =========================================================

function getConversations() {

    try {

        return JSON.parse(
            localStorage.getItem(
                STORAGE_KEY
            ) || "[]"
        );

    }

    catch {

        return [];

    }

}


function saveConversations(
    conversations
) {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            conversations
        )
    );

}


// =========================================================
// SAVE CURRENT CONVERSATION
// =========================================================

function saveCurrentConversation() {

    if (
        !currentChatId ||
        !currentMessages.length
    ) {
        return;
    }


    const conversations =
        getConversations();


    const firstUser =
        currentMessages.find(
            item =>
                item.role === "user"
        );


    const title =
        firstUser &&
        firstUser.text
            ? firstUser.text
            : "New conversation";


    const existingIndex =
        conversations.findIndex(
            item =>
                item.id ===
                currentChatId
        );


    const conversation = {

        id:
            currentChatId,

        title:
            title.length > 50
                ? title.substring(
                    0,
                    50
                ) + "..."
                : title,

        createdAt:
            existingIndex >= 0
                ? conversations[
                    existingIndex
                ].createdAt
                : new Date().toISOString(),

        updatedAt:
            new Date().toISOString(),

        messages:
            currentMessages

    };


    if (
        existingIndex >= 0
    ) {

        conversations[
            existingIndex
        ] = conversation;

    }

    else {

        conversations.unshift(
            conversation
        );

    }


    conversations.sort(
        (a, b) =>
            new Date(b.updatedAt) -
            new Date(a.updatedAt)
    );


    saveConversations(
        conversations.slice(
            0,
            100
        )
    );


    loadChatHistory();

}


// =========================================================
// CHAT HISTORY
// =========================================================

function loadChatHistory(
    search = ""
) {

    if (!chatHistory) {
        return;
    }


    const conversations =
        getConversations();


    chatHistory.innerHTML =
        "";


    const filtered =
        conversations.filter(
            item =>
                item.title
                    .toLowerCase()
                    .includes(
                        search
                            .toLowerCase()
                    )
        );


    const groups = {

        TODAY: [],

        YESTERDAY: [],

        OLDER: []

    };


    filtered.forEach(
        item => {

            const group =
                getDateGroup(
                    item.updatedAt ||
                    item.createdAt
                );


            groups[group].push(
                item
            );

        }
    );


    createHistoryGroup(
        "TODAY",
        groups.TODAY
    );


    createHistoryGroup(
        "YESTERDAY",
        groups.YESTERDAY
    );


    createHistoryGroup(
        "OLDER",
        groups.OLDER
    );


    if (
        filtered.length === 0
    ) {

        chatHistory.innerHTML = `

            <div
                style="
                    padding:20px 12px;
                    text-align:center;
                    color:#999;
                    font-size:12px;
                "
            >
                No chats found
            </div>

        `;

    }

}


// =========================================================
// DATE GROUP
// =========================================================

function getDateGroup(
    dateString
) {

    const date =
        new Date(
            dateString
        );


    const now =
        new Date();


    const today =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );


    const yesterday =
        new Date(
            today
        );


    yesterday.setDate(
        today.getDate() - 1
    );


    const dateOnly =
        new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );


    if (
        dateOnly.getTime() ===
        today.getTime()
    ) {

        return "TODAY";

    }


    if (
        dateOnly.getTime() ===
        yesterday.getTime()
    ) {

        return "YESTERDAY";

    }


    return "OLDER";

}


// =========================================================
// CREATE HISTORY GROUP
// =========================================================

function createHistoryGroup(
    title,
    items
) {

    if (
        !items ||
        !items.length
    ) {

        return;

    }


    const group =
        document.createElement(
            "div"
        );


    group.className =
        "history-group";


    group.innerHTML = `

        <div class="history-group-title">
            ${title}
        </div>

        <div class="history-group-list"></div>

    `;


    const list =
        group.querySelector(
            ".history-group-list"
        );


    items.forEach(
        item => {

            list.appendChild(
                createHistoryItem(
                    item
                )
            );

        }
    );


    chatHistory.appendChild(
        group
    );

}


// =========================================================
// CREATE HISTORY ITEM
// =========================================================

function createHistoryItem(
    item
) {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "history-item";


    if (
        currentChatId ===
        item.id
    ) {

        wrapper.classList.add(
            "active"
        );

    }


    wrapper.innerHTML = `

        <button
            type="button"
            class="history-main"
        >

            <span class="history-icon">
                💬
            </span>

            <span
                class="history-name"
                title="${escapeHTML(item.title)}"
            >
                ${escapeHTML(item.title)}
            </span>

        </button>


        <button
            type="button"
            class="history-menu"
            aria-label="Chat options"
            title="Chat options"
        >
            ⋮
        </button>


        <div
            class="chat-menu-popup"
        >

            <button
                type="button"
                class="rename-option"
            >

                <span>✏️</span>

                <span>Rename</span>

            </button>


            <button
                type="button"
                class="delete-option"
            >

                <span>🗑️</span>

                <span>Delete</span>

            </button>

        </div>

    `;


    const mainButton =
        wrapper.querySelector(
            ".history-main"
        );


    const menuButton =
        wrapper.querySelector(
            ".history-menu"
        );


    const menu =
        wrapper.querySelector(
            ".chat-menu-popup"
        );


    const renameButton =
        wrapper.querySelector(
            ".rename-option"
        );


    const deleteButton =
        wrapper.querySelector(
            ".delete-option"
        );


    mainButton.onclick =
        () => {

            closeAllMenus();

            loadSavedChat(
                item
            );

        };


    menuButton.onclick =
        event => {

            event.stopPropagation();

            closeAllMenus();

            menu.classList.toggle(
                "show"
            );

        };


    renameButton.onclick =
        event => {

            event.stopPropagation();

            closeAllMenus();

            renameChat(
                item.id
            );

        };


    deleteButton.onclick =
        event => {

            event.stopPropagation();

            closeAllMenus();

            deleteChat(
                item.id
            );

        };


    return wrapper;

}


// =========================================================
// CLOSE MENUS
// =========================================================

function closeAllMenus() {

    document
        .querySelectorAll(
            ".chat-menu-popup.show"
        )
        .forEach(
            menu =>
                menu.classList.remove(
                    "show"
                )
        );

}


document.addEventListener(
    "click",
    () => {

        closeAllMenus();

    }
);


// =========================================================
// RENAME
// =========================================================

function renameChat(
    id
) {

    const conversations =
        getConversations();


    const conversation =
        conversations.find(
            item =>
                item.id === id
        );


    if (!conversation) {
        return;
    }


    const overlay =
        document.createElement(
            "div"
        );


    overlay.className =
        "modal-overlay";


    overlay.innerHTML = `

        <div
            class="modal-card"
        >

            <div class="modal-icon">
                ✏️
            </div>

            <h3>
                Rename chat
            </h3>

            <p>
                Give this conversation a clear name.
            </p>

            <input
                type="text"
                class="rename-input"
                value="${escapeHTML(conversation.title)}"
                maxlength="70"
                autocomplete="off"
            >

            <div class="modal-actions">

                <button
                    type="button"
                    class="modal-cancel"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    class="modal-primary"
                >
                    Rename
                </button>

            </div>

        </div>

    `;


    document
        .getElementById(
            "modalContainer"
        )
        .appendChild(
            overlay
        );


    const input =
        overlay.querySelector(
            ".rename-input"
        );


    const cancel =
        overlay.querySelector(
            ".modal-cancel"
        );


    const confirm =
        overlay.querySelector(
            ".modal-primary"
        );


    function close() {

        overlay.remove();

    }


    cancel.onclick =
        close;


    confirm.onclick =
        () => {

            const value =
                input.value.trim();


            if (!value) {

                input.focus();

                return;

            }


            conversation.title =
                value;


            conversation.updatedAt =
                new Date().toISOString();


            saveConversations(
                conversations
            );


            loadChatHistory();


            close();

        };


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                confirm.click();

            }


            if (
                event.key === "Escape"
            ) {

                close();

            }

        }
    );


    setTimeout(
        () => {

            input.focus();

            input.select();

        },
        50
    );

}


// =========================================================
// DELETE
// =========================================================

function deleteChat(
    id
) {

    const conversations =
        getConversations();


    const conversation =
        conversations.find(
            item =>
                item.id === id
        );


    if (!conversation) {
        return;
    }


    const overlay =
        document.createElement(
            "div"
        );


    overlay.className =
        "modal-overlay";


    overlay.innerHTML = `

        <div
            class="modal-card"
        >

            <div class="modal-icon">
                🗑️
            </div>

            <h3>
                Delete chat?
            </h3>

            <p>
                This will permanently remove
                "<strong>${escapeHTML(conversation.title)}</strong>"
                from your chat history.
            </p>

            <div class="modal-actions">

                <button
                    type="button"
                    class="modal-cancel"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    class="modal-delete"
                >
                    Delete
                </button>

            </div>

        </div>

    `;


    document
        .getElementById(
            "modalContainer"
        )
        .appendChild(
            overlay
        );


    const cancel =
        overlay.querySelector(
            ".modal-cancel"
        );


    const confirm =
        overlay.querySelector(
            ".modal-delete"
        );


    cancel.onclick =
        () => overlay.remove();


    confirm.onclick =
        () => {

            const remaining =
                conversations.filter(
                    item =>
                        item.id !== id
                );


            saveConversations(
                remaining
            );


            if (
                currentChatId === id
            ) {

                createNewChat();

            }


            loadChatHistory();


            overlay.remove();

        };

}


// =========================================================
// LOAD SAVED CHAT
// =========================================================

function loadSavedChat(
    conversation
) {

    currentChatId =
        conversation.id;


    currentMessages =
        conversation.messages ||
        [];


    chat.innerHTML =
        "";


    currentMessages.forEach(
        message => {

            if (
                message.role ===
                "user"
            ) {

                addStoredUserMessage(
                    message
                );

            }

            else if (
                message.role ===
                "assistant"
            ) {

                addAIMessage(
                    message.text
                );

            }

        }
    );


    loadChatHistory();


    scrollToBottom();

}


// =========================================================
// STORED USER MESSAGE
// =========================================================

function addStoredUserMessage(
    message
) {

    const row =
        document.createElement(
            "div"
        );


    row.className =
        "message-row user-row";


    const text =
        message.text ||
        "";


    row.innerHTML = `

        <div class="message-content">

            ${
                text
                    ? `
                        <div
                            class="message-bubble user-message"
                        >
                            ${formatText(text)}
                        </div>
                      `
                    : ""
            }

            ${
                message.files &&
                message.files.length
                    ? createStoredFiles(
                        message.files
                    )
                    : ""
            }

        </div>

    `;


    chat.appendChild(
        row
    );

}


// =========================================================
// STORED FILES
// =========================================================

function createStoredFiles(
    files
) {

    return `

        <div class="chat-file-list">

            ${files
                .map(
                    file => `

                        <div
                            class="chat-file-card"
                        >

                            <div class="chat-file-icon">
                                ${getFileIcon(file)}
                            </div>

                            <div class="chat-file-details">

                                <div class="chat-file-name">
                                    ${escapeHTML(file.name)}
                                </div>

                                <div class="chat-file-type">
                                    ${getFileTypeName(file)}
                                    ${formatFileSize(file.size)}
                                </div>

                            </div>

                        </div>

                    `
                )
                .join("")
            }

        </div>

    `;

}


// =========================================================
// REMOVE WELCOME
// =========================================================

function removeWelcome() {

    const welcome =
        document.getElementById(
            "welcome"
        );


    if (welcome) {

        welcome.remove();

    }

}


// =========================================================
// SCROLL
// =========================================================

function scrollToBottom() {

    setTimeout(
        () => {

            if (chat) {

                chat.scrollTo({

                    top:
                        chat.scrollHeight,

                    behavior:
                        "smooth"

                });

            }

        },
        50
    );

}


// =========================================================
// DRAG & DROP
// =========================================================

function setupDragAndDrop() {

    document.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

        }
    );


    document.addEventListener(
        "drop",
        event => {

            event.preventDefault();


            if (
                event.dataTransfer &&
                event.dataTransfer.files &&
                event.dataTransfer.files.length
            ) {

                addSelectedFiles(
                    Array.from(
                        event.dataTransfer.files
                    )
                );

            }

        }
    );

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHTML(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value == null
            ? ""
            : value;


    return div.innerHTML;

}