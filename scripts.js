/**
 * 國立陽明交大附中 - 返校打掃管理系統核心邏輯
 * * 包含四大核心模組：
 * 1. 公告與查詢系統 (一般學生)
 * 2. 掃區分配系統 (衛生股長限定)
 * 3. 區域覆核系統 (糾察員限定)
 * 4. 系統管理後台 (系統管理員/教師限定)
 */

const SUPABASE_URL = "https://vrbmwxcxzahreopugvnl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_41-bQCBL8fUNQmReJCJPCw_8MBkuVy9";
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allAreas = [];
let isAdminAuthenticated = false;

// 全域保留驗證憑證，避免重複跳窗
window._loginClass = '';
window._loginClassPassword = '';
window._inspectorPassword = '';

// 監聽身分驗證狀態變化
_supabase.auth.onAuthStateChange((event, session) => {
    isAdminAuthenticated = !!session;
});

/**
 * 管理員後台介面 HTML 範本
 * 當管理員登入成功後，動態注入至 view-admin 容器中
 */
const ADMIN_HTML = `
<div class="animate-fade space-y-8">
    <div class="flex justify-between items-center bg-slate-100 p-4 rounded-2xl border border-slate-200">
        <div class="flex gap-2">
            <button onclick="downloadAbsentees()" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition">[下載未簽退名單]</button>
            <button onclick="resetAllRoles()" class="bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-amber-600 transition">[重設全員身分為一般生]</button>
        </div>
        <button onclick="handleLogout()" class="text-xs text-rose-500 underline font-bold hover:text-rose-700">[登出管理員身分]</button>
    </div>

    <div class="bg-white p-6 rounded-3xl border shadow-sm">
        <h2 class="text-xl font-bold mb-4 text-amber-600">公告管理</h2>
        <input type="hidden" id="ann-id">
        <div class="grid grid-cols-1 gap-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input type="text" id="ann-title" placeholder="請輸入公告標題" class="border p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500">
                <input type="text" id="ann-author" placeholder="請輸入發布單位 (例如：學務處衛生組)" class="border p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500">
            </div>
            <textarea id="ann-content" placeholder="請輸入公告內容..." class="border p-3 rounded-xl text-sm h-24 outline-none focus:ring-2 focus:ring-amber-500"></textarea>
            <div class="flex gap-2">
                <button id="btn-save-ann" onclick="saveAnnouncement()" class="bg-amber-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-amber-600 transition">發佈</button>
                <button id="btn-cancel-ann-edit" onclick="cancelEditAnnouncement()" class="hidden bg-slate-200 text-slate-600 px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-300 transition">取消</button>
            </div>
        </div>
        <div id="admin-ann-list" class="mt-4 space-y-2 border-t pt-4"></div>
    </div>

    <div class="bg-white p-6 rounded-3xl border shadow-sm">
        <h2 class="text-xl font-bold mb-4 text-blue-700">全校掃區分配清單</h2>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm whitespace-nowrap">
                <thead class="bg-slate-50 border-b">
                    <tr>
                        <th class="p-4">打掃地點 (負責班級)</th>
                        <th class="p-4">已分配學生名單與狀態</th>
                        <th class="p-4 text-center">剩餘名額</th>
                    </tr>
                </thead>
                <tbody id="admin-area-status-list"></tbody>
            </table>
        </div>
    </div>

    <div class="bg-white p-6 rounded-3xl border shadow-sm">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4 gap-4">
            <h2 class="text-xl font-bold text-slate-800">教師手動點名與簽到退系統</h2>
            <div class="flex flex-wrap gap-2 w-full md:w-auto">
                <select id="roll-session" class="border p-2 rounded-xl text-sm bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="第一次返校">第一次返校</option>
                    <option value="第二次返校">第二次返校</option>
                </select>
                <input type="text" id="roll-cls" placeholder="請輸入班級或學號" class="border p-2 rounded-xl text-sm flex-grow outline-none focus:ring-2 focus:ring-blue-500">
                <button onclick="loadRollCall()" class="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition">載入名單</button>
            </div>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm whitespace-nowrap">
                <tbody id="roll-list"></tbody>
            </table>
        </div>
    </div>

    <div class="bg-white p-6 rounded-3xl border shadow-sm">
        <h2 class="text-xl font-bold mb-4 text-slate-700">學生權限與糾察身分設定</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="text" inputmode="numeric" pattern="[0-9]*" id="m-cls" placeholder="學生班級 (例如 101)" class="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500">
            <input type="text" inputmode="numeric" pattern="[0-9]*" id="m-seat" placeholder="學生座號 (例如 1)" class="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500">
            <select id="m-role" class="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="一般學生">一般學生</option>
                <option value="衛生糾察">衛生糾察</option>
                <option value="環境糾察">環境糾察</option>
            </select>
        </div>
        <button onclick="saveStudentRole()" class="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition">更新學生身分</button>
    </div>

    <div class="bg-white p-6 rounded-3xl border shadow-sm">
        <h2 class="text-xl font-bold mb-4 font-mono">系統掃區清單設定</h2>
        <input type="hidden" id="a-id">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            <input type="text" id="a-loc" placeholder="掃區名稱" class="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-800">
            <input type="text" id="a-cls" placeholder="班級代碼" class="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-800">
            <input type="text" inputmode="numeric" pattern="[0-9]*" id="a-max" placeholder="人數上限" class="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-800">
        </div>
        <div class="flex gap-2">
            <button id="btn-save-area" onclick="saveArea()" class="bg-slate-800 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-900 transition">儲存掃區資料</button>
            <button id="btn-cancel-edit" onclick="cancelEditArea()" class="hidden bg-slate-200 text-slate-600 px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-300 transition">取消目前編輯</button>
        </div>
        <div class="mt-6 overflow-x-auto">
            <table class="w-full text-xs text-left whitespace-nowrap">
                <tbody id="admin-area-list"></tbody>
            </table>
        </div>
    </div>

    <div class="bg-white p-6 rounded-3xl border shadow-sm">
        <h2 class="text-xl font-bold mb-4 text-purple-700">衛生股長通行碼設定</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="text" id="cp-class" placeholder="班級 (例如 101)" class="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500">
            <div class="flex gap-1">
                <input type="text" id="cp-password" placeholder="設定通行碼" class="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 flex-grow">
                <button onclick="generateRandomPassword()" class="bg-slate-500 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-600 transition" title="隨機產生通行碼">🎲</button>
            </div>
            <button onclick="saveClassPassword()" class="bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-purple-700 transition">儲存通行碼</button>
        </div>
        <div id="cp-list" class="mt-4 space-y-2 border-t pt-4"></div>
    </div>

    <div class="p-6 bg-rose-50 rounded-3xl border border-rose-200">
        <h3 class="text-lg font-bold text-rose-700 mb-2">系統操作區</h3>
        <p class="text-xs text-rose-600 mb-4">以下操作將永久刪除資料庫中的紀錄。</p>
        <div class="flex flex-wrap gap-2">
            <button onclick="handleClearData('登記紀錄')" class="bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-rose-600 transition">清空 所有登記紀錄</button>
            <button onclick="handleClearData('點名紀錄')" class="bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-rose-600 transition">清空 所有點名紀錄</button>
            <button onclick="handleClearData('掃區紀錄')" class="bg-rose-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-rose-900 transition">清空 所有掃區清單</button>
        </div>
    </div>
</div>
`;

// 初始化流程：網頁載入完成後，自動抓取公告與掃區資料
document.addEventListener('DOMContentLoaded', () => {
    fetchAnnouncements();
    fetchAreas();
});

/* ==========================================
 * 通用工具函式 (Utility Functions)
 * ========================================== */

function formatDateTime(isoString) {
    if (!isoString) return '尚無紀錄';
    const dateObj = new Date(isoString);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0'); // 擷取秒數
    
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`; // 增加 :秒 輸出
}

function toggleLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.classList.toggle('active', show);
    }
}

async function verifyRpc(key, input) {
    try {
        const { data, error } = await _supabase.rpc('verify_config', { p_key: key, p_input: input });
        if (error) {
            console.error("RPC 驗證過程中發生錯誤:", error);
            return false;
        }
        return data === true;
    } catch (exception) {
        console.error("系統執行 RPC 時發生例外狀況:", exception);
        return false;
    }
}

function openAuthModal(title, desc, options = { showClass: false, showEmail: false }) {
    return new Promise((resolve) => {
        const modal = document.getElementById('auth-modal');
        const titleEl = document.getElementById('auth-modal-title');
        const descEl = document.getElementById('auth-modal-desc');
        const classField = document.getElementById('auth-modal-class-field');
        const emailField = document.getElementById('auth-modal-email-field');
        const classInput = document.getElementById('auth-modal-class');
        const emailInput = document.getElementById('auth-modal-email');
        const pwdInput = document.getElementById('auth-modal-input');
        const submitBtn = document.getElementById('auth-modal-submit');

        // 初始化狀態
        titleEl.innerText = title;
        descEl.innerText = desc;
        pwdInput.value = '';
        classInput.value = '';
        emailInput.value = '';
        
        // 控制特殊欄位顯隱
        classField.classList.toggle('hidden', !options.showClass);
        emailField.classList.toggle('hidden', !options.showEmail);

        modal.classList.remove('hidden');
        
        if (options.showEmail) {
            emailInput.focus();
        } else if (options.showClass) {
            classInput.focus();
        } else {
            pwdInput.focus();
        }

        // 確認送出
        submitBtn.onclick = () => {
            const password = pwdInput.value.trim();
            const className = classInput.value.trim();
            const email = emailInput.value.trim();
            
            if (!password || (options.showClass && !className) || (options.showEmail && !email)) {
                alert("請填寫所有必要欄位。");
                return;
            }
            
            modal.classList.add('hidden');
            resolve({ success: true, password, className, email });
        };

        // 全域取消函數
        window.closeAuthModal = () => {
            modal.classList.add('hidden');
            resolve({ success: false, password: '', className: '', email: '' });
        };
    });
}

async function switchTab(tab) {
    if (tab === 'allocation') {
        let targetClass = window._loginClass;
        let inputPw = window._loginClassPassword;

        // 若無快取憑證，才跳出窗要求輸入
        if (!targetClass || !inputPw) {
            const auth = await openAuthModal(
                "衛生股長登入認證", 
                "本頁面僅限衛生股長操作，請輸入負責班級與通行碼。",
                { showClass: true, showEmail: false }
            );
            
            if (!auth.success) return; 
            
            targetClass = auth.className;
            inputPw = auth.password;
        
            toggleLoading(true);

            // 確保完全使用 SDK，它會自動幫妳補上 apikey 請求標頭
            const { data: configData, error } = await _supabase
                    .from('settings')
                    .select('value')
                    .eq('key', `class_${targetClass}`)
                    .maybeSingle(); // 使用 maybeSingle 避免找不到資料時噴出嚴重錯誤
            
            toggleLoading(false);
            
            if (error || !configData || configData.value !== inputPw) {
                alert("通行碼輸入錯誤或該班級尚未設定！");
                return; 
            }
        
            if (error || !configData || configData.value !== inputPw) {
                alert("通行碼輸入錯誤！");
                return; 
            }

            // 驗證成功，存入快取變數中
            window._loginClass = targetClass;
            window._loginClassPassword = inputPw;
        }
        
        // 確保 DOM 已渲染完畢再填值
        setTimeout(() => {
            const clsField = document.getElementById('stu-class');
            if (clsField) {
                clsField.value = targetClass;
                clsField.readOnly = targetClass !== '000'; 
                if (targetClass === '000') {
                    clsField.oninput = async () => {
                        await fetchAreas();
                        await fetchAllocations();
                    };
                } else {
                    clsField.oninput = null;
                }
            }
        
            const passcodeField = document.getElementById('alloc-passcode');
            if (passcodeField) {
                passcodeField.value = inputPw;
            }
        }, 50);
            
        await fetchAreas();
        await fetchAllocations();
    }
    
    if (tab === 'inspector') {
        let inputPw = window._inspectorPassword;

        // 若無快取密碼，才進行驗證彈窗
        if (!inputPw) {
            const auth = await openAuthModal(
                "糾察認證", 
                "本頁面僅限衛生糾察員操作覆核，請輸入密碼。",
                { showClass: false, showEmail: false }
            );
            
            if (!auth.success) return;
            inputPw = auth.password;

            toggleLoading(true);
            const isAuthorized = await verifyRpc('password', inputPw);
            toggleLoading(false);

            if (!isAuthorized) {
                alert("糾察密碼錯誤。");
                return;
            }

            // 驗證成功，保留快取密碼
            window._inspectorPassword = inputPw;
        }

        setTimeout(() => {
            const inspectorField = document.getElementById('inspector-pwd');
            if (inspectorField) {
                inspectorField.value = inputPw;
            }
        }, 50);
    }

    if (tab === 'admin') {
        const { data: authData } = await _supabase.auth.getSession();
        
        if (!authData.session) {
            const auth = await openAuthModal(
                "系統管理員身分驗證",
                "此區塊為學校管理後台，需登入經過授權的電子郵件與密碼方可操作。",
                { showClass: false, showEmail: true }
            );

            if (!auth.success) return; 

            toggleLoading(true);
            const { error: signInError } = await _supabase.auth.signInWithPassword({ 
                email: auth.email, 
                password: auth.password 
            });
            toggleLoading(false);

            if (signInError) {
                alert("電子郵件或密碼輸入錯誤，請重新嘗試。");
                return;
            }
        }

        const adminView = document.getElementById('view-admin');
        if (adminView && adminView.innerHTML.trim() === "") {
            adminView.innerHTML = ADMIN_HTML;
        }
    }

    // --- 分頁顯隱切換與導覽列樣式變更 ---
    const allViews = document.querySelectorAll('.tab-view');
    for (let i = 0; i < allViews.length; i++) {
        allViews[i].classList.add('hidden');
    }

    const targetView = document.getElementById(`view-${tab}`);
    if (targetView) {
        targetView.classList.remove('hidden');
    }

    const navButtons = document.querySelectorAll('nav button');
    for (let j = 0; j < navButtons.length; j++) {
        navButtons[j].classList.remove('tab-active', 'text-blue-600', 'border-blue-600');
        navButtons[j].classList.add('text-slate-500', 'border-transparent');
    }

    const targetButton = document.getElementById(`tab-${tab}`);
    if (targetButton) {
        targetButton.classList.add('tab-active', 'text-blue-600', 'border-blue-600');
        targetButton.classList.remove('text-slate-500', 'border-transparent');
    }

    if (tab === 'query') {
        await fetchAnnouncements();
    } else if (tab === 'allocation') {
        await fetchAreas();
        await fetchAllocations();
    } else if (tab === 'inspector') {
        await fetchRegistrationsByArea();
    } else if (tab === 'admin') {
        await refreshAdminPanel();
    }
}
/**
 * 處理管理員登出程序
 */
async function handleLogout() {
    const isConfirmed = confirm("即將登出系統管理員身分，確定執行？");
    if (!isConfirmed) return;

    try {
        await _supabase.auth.signOut();
        const adminView = document.getElementById('view-admin');
        if (adminView) {
            adminView.innerHTML = '';
        }
        switchTab('query');
    } catch (error) {
        console.error("登出程序發生錯誤:", error);
        alert("登出失敗，請重整網頁。");
    }
}

/* ==========================================
 * 第一頁：公告查詢系統 (Tab: Query)
 * ========================================== */

async function fetchAnnouncements() {
    try {
        const { data, error } = await _supabase.from('announcements')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const board = document.getElementById('bulletin-board');
        if (!board) return;

        if (!data || data.length === 0) {
            board.innerHTML = '<p class="text-center text-slate-400 py-6 text-sm col-span-full">尚無任何公告。</p>';
            return;
        }

        let htmlContent = '';
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const authorTag = item.author ? `<span class="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[11px] font-bold ml-2">${item.author}</span>` : '';
            htmlContent += `
                <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm animate-fade">
                    <h4 class="font-black text-slate-800 mb-1 leading-tight">[公告] ${item.title} ${authorTag}</h4>
                    <div class="text-sm text-slate-500 mt-2">${item.content}</div>
                    <div class="text-[10px] text-slate-300 mt-3 font-mono uppercase">發佈時間：${formatDateTime(item.created_at)}</div>
                </div>
            `;
        }
        board.innerHTML = htmlContent;

        const scripts = board.getElementsByTagName('script');
        for (let j = 0; j < scripts.length; j++) {
            const scriptNode = document.createElement('script');
            if (scripts[j].src) scriptNode.src = scripts[j].src;
            scriptNode.textContent = scripts[j].textContent;
            document.head.appendChild(scriptNode).parentNode.removeChild(scriptNode);
        }

    } catch (error) {
        console.error("取得公告清單失敗:", error);
    }
}

/**
 * 處理學生透過學號查詢個人打掃紀錄的邏輯
 */
async function handleQueryBySid() {
    const sidInput = document.getElementById('q-sid');
    if (!sidInput) return;

    const sid = sidInput.value.trim();
    if (sid.length < 6) {
        alert("請輸入正確學號。");
        return;
    }

    toggleLoading(true);
    const resBox = document.getElementById('query-result');

    try {
        const { data: studentDataArr, error: stuError } = await _supabase.rpc('get_student_by_sid', { p_sid: sid });
        const studentData = studentDataArr && studentDataArr.length > 0 ? studentDataArr[0] : null;

        if (stuError || !studentData) {
            toggleLoading(false);
            alert("學號不存在。");
            return;
        }

        const { data: regData } = await _supabase.from('registrations')
            .select('*')
            .eq('class_name', studentData.class_name)
            .eq('seat_number', studentData.seat_number)
            .limit(1);

        const { data: attData } = await _supabase.from('attendance')
            .select('*')
            .eq('student_id', sid);

        toggleLoading(false);
        resBox.classList.remove('hidden');

        const currentRegistration = regData && regData.length > 0 ? regData[0] : null;
        let assignedLocation = '尚未分配任何掃區';
        let currentStatus = '尚未建立狀態';

        if (currentRegistration) {
            const matchedArea = allAreas.find(area => area.id === currentRegistration.area_id);
            if (matchedArea) {
                assignedLocation = matchedArea.location;
            }
            currentStatus = currentRegistration.status || '等待覆核中';
        }

        let resultHtml = `
            <div class="flex justify-between items-center mb-4 border-b pb-2">
                <h3 class="text-lg font-black">${studentData.class_name} 班 ${studentData.seat_number} 號</h3>
                <span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono">學號：${sid}</span>
            </div>
            <p class="text-sm mb-4">
                分配掃區位置：<b class="text-blue-600">${assignedLocation}</b> 
                <span class="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded ml-1">[狀態：${currentStatus}]</span>
            </p>
            <div class="space-y-2">
        `;

        const sessionTypes = ['第一次返校', '第二次返校'];
        for (let j = 0; j < sessionTypes.length; j++) {
            const sessionName = sessionTypes[j];
            const logMatch = attData ? attData.find(record => record.session_type === sessionName) : null;
            const isCompleted = logMatch && logMatch.check_out;

            const borderClass = isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200';
            const textClass = isCompleted ? 'text-emerald-700' : 'text-rose-600';
            const statusLabel = isCompleted ? '[已簽退]' : '[未完成]';

            resultHtml += `
                <div class="p-3 rounded-2xl border ${borderClass}">
                    <p class="text-xs font-bold ${textClass}">${statusLabel} ${sessionName}</p>
                    <p class="text-[10px] text-slate-500 mt-1 font-mono">
                        簽到時間：${formatDateTime(logMatch?.check_in)} / 簽退時間：${formatDateTime(logMatch?.check_out)}
                    </p>
                </div>
            `;
        }
        resultHtml += '</div>';
        resBox.innerHTML = resultHtml;

    } catch (err) {
        toggleLoading(false);
        console.error("執行查詢時發生嚴重錯誤:", err);
        alert("系統連線異常，請稍後再試。");
    }
}

/* ==========================================
 * 第二頁：掃區分配系統 (Tab: Allocation)
 * ========================================== */

async function fetchAreas() {
    toggleLoading(true);
    try {
        const { data: areasData, error: areasError } = await _supabase.from('areas')
            .select('*')
            .order('class_name');

        if (areasError) throw areasError;

        const { data: regsData, error: regsError } = await _supabase.from('registrations')
            .select('area_id');

        if (regsError) throw regsError;

        toggleLoading(false);
        allAreas = areasData || [];

        const selectElement = document.getElementById('stu-area');
        if (!selectElement) return;

        let optionsHtml = '';
        const loginClass = window._loginClass || '';
        const currentInputClass = document.getElementById('stu-class')?.value.trim() || '';
        
        for (let k = 0; k < allAreas.length; k++) {
            const areaItem = allAreas[k];
            let shouldShow = false;

            if (loginClass === '000') {
                shouldShow = String(areaItem.class_name) === '000' || 
                             String(areaItem.class_name) === currentInputClass;
            } else {
                shouldShow = String(areaItem.class_name) === loginClass;
            }

            if (!shouldShow) continue;
        
            const assignedCount = (regsData || []).filter(r => r.area_id === areaItem.id).length;
            const remainingSpots = areaItem.max_count - assignedCount;
            const isFullyBooked = remainingSpots <= 0;
        
            const disableAttr = isFullyBooked ? 'disabled' : '';
            const statusText = isFullyBooked ? '已無名額' : `尚餘 ${remainingSpots} 個名額`;
        
            optionsHtml += `<option value="${areaItem.id}" ${disableAttr}>[${areaItem.class_name}班負責] ${areaItem.location} (狀態：${statusText})</option>`;
        }
        selectElement.innerHTML = optionsHtml;

    } catch (error) {
        toggleLoading(false);
        console.error("載入掃區資料庫失敗:", error);
        alert("無法取得最新掃區名額資料。");
    }
}

async function handleAllocation() {
    const clsValue = document.getElementById('stu-class').value;
    const seatValue = document.getElementById('stu-seat').value;
    const areaIdValue = document.getElementById('stu-area').value;
    const passcodeValue = document.getElementById('alloc-passcode').value;

    if (!clsValue || !seatValue || !areaIdValue) {
        alert("：請完整填寫班級與座號。");
        return;
    }

    toggleLoading(true);

    try {
        const isAuthorized = await verifyRpc(`class_${window._loginClass}`, passcodeValue);
        if (!isAuthorized) {
            toggleLoading(false);
            alert("授權過期或通行碼錯誤。");
            return;
        }

        const selectedArea = allAreas.find(area => String(area.id) === areaIdValue);
        if (!selectedArea) {
            toggleLoading(false);
            alert("找不到對應的掃區資料。");
            return;
        }

        if (String(selectedArea.class_name) !== '000' && String(selectedArea.class_name) !== clsValue) {
            toggleLoading(false);
            alert(`此掃區僅開放給「${selectedArea.class_name}」班學生。`);
            return;
        }

        const insertPayload = {
            class_name: clsValue,
            seat_number: seatValue,
            area_id: areaIdValue
        };

        const { error: insertError } = await _supabase.from('registrations').insert([insertPayload]);

        toggleLoading(false);
        if (insertError) {
            alert("該名學生可能已有紀錄，或名額已滿。");
        } else {
            alert("分配作業成功！");
            await fetchAreas();
            await fetchAllocations();
            document.getElementById('stu-seat').value = '';
        }
    } catch (error) {
        toggleLoading(false);
        console.error("分配程序異常:", error);
        alert("系統發生未知錯誤。");
    }
}

async function fetchAllocations() {
    const clsValue = document.getElementById('stu-class').value;
    if (!clsValue) return;

    const listBox = document.getElementById('alloc-list');
    if (!listBox) return;

    let query = _supabase.from('registrations').select('*');

    if (clsValue === '000') {
        const areaIds = allAreas
            .filter(a => String(a.class_name) === '000')
            .map(a => a.id);
        if (areaIds.length === 0) {
            listBox.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">尚無登記紀錄。</p>';
            return;
        }
        query = query.in('area_id', areaIds);
    } else {
        query = query.eq('class_name', clsValue);
    }

    const { data, error } = await query.order('seat_number');

    if (!data || data.length === 0) {
        listBox.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">目前尚無登記紀錄。</p>';
        return;
    }

    let html = '';
    for (let i = 0; i < data.length; i++) {
        const reg = data[i];
        const matchedArea = allAreas.find(a => a.id === reg.area_id);
        const locationName = matchedArea ? matchedArea.location : '未知掃區';

        html += `
            <div class="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                <span class="font-bold text-slate-700">${reg.class_name} 班 ${reg.seat_number} 號</span>
                <span class="text-blue-600">${locationName}</span>
                <button onclick="deleteAllocation(${reg.id}, '${reg.class_name}')" class="text-rose-500 hover:text-rose-700 font-bold border border-rose-200 bg-rose-50 px-2 py-1 rounded-lg transition">刪除</button>
            </div>
        `;
    }
    listBox.innerHTML = html;
}

async function deleteAllocation(regId, regClass) {
    const clsValue = document.getElementById('stu-class').value;
    
    if (clsValue !== '000' && String(regClass) !== String(clsValue)) {
        alert("只能刪除本班的登記紀錄。");
        return;
    }
    
    const isConfirmed = confirm("確定要刪除此筆登記紀錄嗎？");
    if (!isConfirmed) return;

    const passcodeValue = document.getElementById('alloc-passcode').value;
    toggleLoading(true);

    const isAuthorized = await verifyRpc(`class_${window._loginClass}`, passcodeValue);
    if (!isAuthorized) {
        toggleLoading(false);
        alert("授權過期，請重新進入頁面。");
        return;
    }

    const { error } = await _supabase.from('registrations').delete().eq('id', regId);
    toggleLoading(false);

    if (error) {
        alert("刪除失敗：" + error.message);
    } else {
        await fetchAreas();
        await fetchAllocations();
    }
}

/* ==========================================
 * 第三頁：區域覆核系統 (Tab: Inspector)
 * ========================================== */

async function fetchRegistrationsByArea() {
    toggleLoading(true);
    try {
        if (allAreas.length === 0) {
            await fetchAreas();
        }

        const { data: registrationsData, error: regsError } = await _supabase.from('registrations').select('*');

        if (regsError) throw regsError;
        toggleLoading(false);

        const listContainer = document.getElementById('inspector-list');
        if (!listContainer) return;

        const groupedData = [];
        for (let a = 0; a < allAreas.length; a++) {
            const currentArea = allAreas[a];
            const studentsInArea = (registrationsData || []).filter(reg => reg.area_id === currentArea.id);

            let pendingStudentsCount = 0;
            for (let s = 0; s < studentsInArea.length; s++) {
                if (studentsInArea[s].status !== '合格') {
                    pendingStudentsCount++;
                }
            }

            if (studentsInArea.length > 0) {
                groupedData.push({
                    areaData: currentArea,
                    studentsList: studentsInArea,
                    pendingCount: pendingStudentsCount
                });
            }
        }

        if (groupedData.length === 0) {
            listContainer.innerHTML = '<tr><td class="p-10 text-center text-slate-400">目前全校所有區域皆已檢查。</td></tr>';
            return;
        }

        let outputHtml = '';
        for (let g = 0; g < groupedData.length; g++) {
            const group = groupedData[g];

            let namesStringArray = [];
            for (let n = 0; n < group.studentsList.length; n++) {
                const stu = group.studentsList[n];
                const isPass = stu.status === '合格';
                const colorClass = isPass ? 'text-emerald-600 font-bold' : 'text-slate-500';
                const tag = stu.status === '需重掃' ? '(被標記重掃)' : '';
                const displayName = String(group.areaData.class_name) === '000' 
                    ? `${stu.class_name}班${stu.seat_number}號` 
                    : `${stu.seat_number}號`;
                namesStringArray.push(`<span class="${colorClass}">${displayName}${tag}</span>`);
            }
            const namesDisplay = namesStringArray.join('、');

            let actionButtonsHtml = '';
            if (group.pendingCount > 0) {
                actionButtonsHtml = `
                    <button onclick="auditArea('${group.areaData.id}', '合格')" class="bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-600 transition mb-1">批准整區合格</button>
                    <button onclick="auditArea('${group.areaData.id}', '需重掃')" class="bg-rose-100 text-rose-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-rose-200 transition">退回全區重掃</button>
                `;
            } else {
                actionButtonsHtml = '<span class="text-emerald-500 text-xs font-bold border border-emerald-200 bg-emerald-50 px-2 py-1 rounded">該區已全數通過</span>';
            }

            outputHtml += `
                <tr class="border-b hover:bg-slate-50 transition duration-150">
                    <td class="p-4">
                        <div class="font-black text-slate-800">${group.areaData.location}</div>
                        <div class="text-[10px] text-blue-600 font-bold mt-1">由 ${group.areaData.class_name} 班 負責維護</div>
                        <div class="text-[11px] text-slate-500 mt-2 leading-relaxed">當前負責座號：<br>${namesDisplay}</div>
                    </td>
                    <td class="p-4 text-right align-middle">
                        <div class="flex flex-col items-end gap-1">
                            ${actionButtonsHtml}
                        </div>
                    </td>
                </tr>
            `;
        }
        listContainer.innerHTML = outputHtml;

    } catch (error) {
        toggleLoading(false);
        console.error("載入覆核清單失敗:", error);
        alert("讀取覆核資料時發生錯誤。");
    }
}

async function auditArea(areaId, targetStatus) {
    const inspectorPwField = document.getElementById('inspector-pwd');
    const pwdValue = inspectorPwField ? inspectorPwField.value : '';

    if (!pwdValue) {
        alert("尚未取得授權。");
        return;
    }

    toggleLoading(true);

    try {
        const isAuthorized = await verifyRpc('password', pwdValue);
        if (!isAuthorized) {
            toggleLoading(false);
            alert("糾察密碼錯誤。");
            return;
        }

        const { error: updateError } = await _supabase.from('registrations')
            .update({ status: targetStatus })
            .eq('area_id', areaId);

        toggleLoading(false);

        if (updateError) {
            console.error("批次更新狀態失敗:", updateError);
            alert("資料庫更新失敗，請檢查網路連線。");
        } else {
            await fetchRegistrationsByArea();
        }

    } catch (error) {
        toggleLoading(false);
        console.error("覆核程序發生例外錯誤:", error);
    }
}

/* ==========================================
 * 第四頁：管理後台功能 (Tab: Admin)
 * ========================================== */

async function editAnnouncement(targetId) {
    toggleLoading(true);
    try {
        const { data: annItem, error } = await _supabase.from('announcements').select('*').eq('id', targetId).single();
        toggleLoading(false);

        if (error || !annItem) {
            alert("找不到該篇公告資料。");
            return;
        }

        document.getElementById('ann-id').value = annItem.id;
        document.getElementById('ann-title').value = annItem.title;
        document.getElementById('ann-author').value = annItem.author || ''; // 填入發布單位
        document.getElementById('ann-content').value = annItem.content;

        const saveBtn = document.getElementById('btn-save-ann');
        if (saveBtn) saveBtn.innerText = '提交修改公告';

        const cancelBtn = document.getElementById('btn-cancel-ann-edit');
        if (cancelBtn) cancelBtn.classList.remove('hidden');
    } catch (err) {
        toggleLoading(false);
        console.error("讀取公告發生例外", err);
    }
}

function cancelEditAnnouncement() {
    document.getElementById('ann-id').value = '';
    document.getElementById('ann-title').value = '';
    document.getElementById('ann-author').value = ''; // 清空發布單位
    document.getElementById('ann-content').value = '';

    const saveBtn = document.getElementById('btn-save-ann');
    if (saveBtn) saveBtn.innerText = '發佈公告';

    const cancelBtn = document.getElementById('btn-cancel-ann-edit');
    if (cancelBtn) cancelBtn.classList.add('hidden');
}

async function saveAnnouncement() {
    const idValue = document.getElementById('ann-id').value;
    const titleElement = document.getElementById('ann-title');
    const authorElement = document.getElementById('ann-author');
    const contentElement = document.getElementById('ann-content');
    if (!titleElement || !contentElement) return;

    const titleStr = titleElement.value.trim();
    const authorStr = authorElement ? authorElement.value.trim() : '';
    const contentStr = contentElement.value.trim();

    if (!titleStr) {
        alert("公告標題不得為空白。");
        return;
    }

    toggleLoading(true);
    try {
        const payloadData = { title: titleStr, author: authorStr, content: contentStr };
        let responseObj;

        if (idValue) {
            responseObj = await _supabase.from('announcements').update(payloadData).eq('id', idValue);
        } else {
            responseObj = await _supabase.from('announcements').insert([payloadData]);
        }

        toggleLoading(false);

        if (responseObj.error) {
            alert("儲存公告失敗：" + responseObj.error.message);
        } else {
            cancelEditAnnouncement();
            await refreshAdminPanel();
            alert("系統提示：公告儲存成功。");
        }
    } catch (err) {
        toggleLoading(false);
        console.error(err);
    }
}

async function deleteAnnouncement(announcementId) {
    const isConfirmed = confirm("確定要永久刪除此篇公告訊息嗎？");
    if (!isConfirmed) return;

    toggleLoading(true);
    try {
        await _supabase.from('announcements').delete().eq('id', announcementId);
        toggleLoading(false);
        await fetchAnnouncements();
        await refreshAdminPanel();
    } catch (err) {
        toggleLoading(false);
        console.error("刪除公告失敗", err);
    }
}

async function downloadAbsentees() {
    const sessionTarget = prompt("請輸入欲匯出名單的目標梯次名稱 (例如：第一次返校)：", "第一次返校");
    if (!sessionTarget) return;

    toggleLoading(true);
    try {
        const { data: allStudents, error: stuErr } = await _supabase.from('students').select('*');
        if (stuErr) throw stuErr;

        const { data: presentLogs, error: logErr } = await _supabase.from('attendance')
            .select('student_id')
            .eq('session_type', sessionTarget)
            .not('check_out', 'is', null);

        if (logErr) throw logErr;
        toggleLoading(false);

        const attendedIdSet = new Set();
        for (let idx = 0; idx < presentLogs.length; idx++) {
            attendedIdSet.add(presentLogs[idx].student_id);
        }

        const absenteeList = [];
        for (let idx = 0; idx < allStudents.length; idx++) {
            if (!attendedIdSet.has(allStudents[idx].student_id)) {
                absenceList.push(allStudents[idx]);
            }
        }

        let csvString = "\ufeff班級,座號,系統學號,系統角色\n";
        for (let k = 0; k < absenteeList.length; k++) {
            const abs = absenteeList[k];
            csvString += `${abs.class_name},${abs.seat_number},${abs.student_id},${abs.role}\n`;
        }

        const blobObject = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const anchorElement = document.createElement("a");
        anchorElement.href = URL.createObjectURL(blobObject);
        anchorElement.download = `未完成簽退名單匯出_${sessionTarget}.csv`;
        document.body.appendChild(anchorElement);
        anchorElement.click();
        document.body.removeChild(anchorElement);

    } catch (err) {
        toggleLoading(false);
        console.error("產生匯出報表時發生錯誤", err);
        alert("檔案產出失敗。");
    }
}

async function loadRollCall() {
    const inputElement = document.getElementById('roll-cls');
    const sessionElement = document.getElementById('roll-session');
    if (!inputElement || !sessionElement) return;

    const inputValue = inputElement.value.trim();
    const sessionValue = sessionElement.value;

    if (!inputValue) {
        alert("請提供搜尋條件。");
        return;
    }

    toggleLoading(true);
    try {
        let queryBuilder = _supabase.from('students').select('*');

        if (inputValue.length >= 6) {
            queryBuilder = queryBuilder.eq('student_id', inputValue);
        } else {
            const classArray = inputValue.split(/[\s,]+/);
            queryBuilder = queryBuilder.in('class_name', classArray);
        }

        const { data: studentsData, error: qError } = await queryBuilder.order('class_name').order('seat_number');
        if (qError) throw qError;

        const { data: logsData, error: lError } = await _supabase.from('attendance')
            .select('*')
            .eq('session_type', sessionValue);
        if (lError) throw lError;

        toggleLoading(false);

        const listBody = document.getElementById('roll-list');
        if (!listBody) return;

        if (!studentsData || studentsData.length === 0) {
            listBody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500">查無符合條件的資料，請確認搜尋關鍵字。</td></tr>';
            return;
        }

        let trHtml = '';
        for (let i = 0; i < studentsData.length; i++) {
            const stu = studentsData[i];
            const logRecord = logsData ? logsData.find(l => l.student_id === stu.student_id) : null;

            let roleStyleClass = 'bg-slate-100 text-slate-500';
            if (stu.role === '衛生糾察') {
                roleStyleClass = 'bg-blue-100 text-blue-800 border border-blue-200';
            } else if (stu.role === '環境糾察') {
                roleStyleClass = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
            }

            trHtml += `
                <tr class="border-b hover:bg-slate-50 transition">
                    <td class="p-3 align-middle">
                        <div class="font-bold text-slate-800">${stu.class_name} 班 ${stu.seat_number} 號</div>
                        <div class="text-[10px] text-slate-400 font-mono mt-0.5">學號：${stu.student_id}</div>
                    </td>
                    <td class="p-3 align-middle">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${roleStyleClass}">${stu.role}</span>
                    </td>
                    <td class="p-3 text-[10px] font-mono leading-relaxed align-middle">
                        <div class="mb-1 text-slate-600">簽到時間：<span class="${logRecord?.check_in ? 'text-blue-600 font-bold' : ''}">${formatDateTime(logRecord?.check_in)}</span></div>
                        <div class="text-slate-600">簽退時間：<span class="${logRecord?.check_out ? 'text-emerald-600 font-bold' : ''}">${formatDateTime(logRecord?.check_out)}</span></div>
                    </td>
                    <td class="p-3 text-right align-middle whitespace-nowrap">
                        <button onclick="doRoll('${stu.student_id}', 'in')" class="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200 transition">執行簽到</button>
                        <button onclick="doRoll('${stu.student_id}', 'out')" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-200 transition ml-1">執行簽退</button>
                    </td>
                </tr>
            `;
        }
        listBody.innerHTML = trHtml;

    } catch (err) {
        toggleLoading(false);
        console.error("載入點名名單時發生錯誤", err);
    }
}

async function doRoll(sid, actionType) {
    const sessionElement = document.getElementById('roll-session');
    if (!sessionElement) return;
    const sessionTarget = sessionElement.value;

    toggleLoading(true);
    try {
        const currentTimeString = new Date().toISOString();
        const datePartString = currentTimeString.split('T')[0];

        const payloadObject = {
            student_id: sid,
            session_type: sessionTarget,
            roll_date: datePartString
        };

        if (actionType === 'in') {
            payloadObject.check_in = currentTimeString;
        } else {
            payloadObject.check_out = currentTimeString;
        }

        const { error } = await _supabase.from('attendance')
            .upsert(payloadObject, { onConflict: 'student_id, session_type' });

        toggleLoading(false);
        if (error) {
            console.error("寫入點名資料庫失敗", error);
            alert("寫入失敗，請重試。");
        } else {
            await loadRollCall();
        }
    } catch (err) {
        toggleLoading(false);
        console.error("點名邏輯異常", err);
    }
}

async function saveStudentRole() {
    const classInput = document.getElementById('m-cls').value.trim();
    const seatInput = document.getElementById('m-seat').value.trim();
    const roleSelect = document.getElementById('m-role').value;

    if (!classInput || !seatInput) {
        alert("請填寫目標班級與座號資訊。");
        return;
    }

    toggleLoading(true);
    try {
        const { data, error } = await _supabase.from('students')
            .update({ role: roleSelect })
            .eq('class_name', classInput)
            .eq('seat_number', seatInput)
            .select();

        toggleLoading(false);

        if (error) {
            alert("資料庫更新拒絕：" + error.message);
        } else if (!data || data.length === 0) {
            alert("資料庫中查無此「班級」與「座號」的學生紀錄，請確認輸入是否正確。");
        } else {
            document.getElementById('m-seat').value = '';
            alert(`已成功將 ${classInput} 班 ${seatInput} 號的更新為「${roleSelect}」。`);
        }
    } catch (err) {
        toggleLoading(false);
        console.error("身分更新失敗", err);
        alert("系統執行時發生異常狀況。");
    }
}

async function resetAllRoles() {
    const confirmationText = prompt("此動作將把全體學生的身分改寫為「一般學生」。若確認執行，請輸入字串 RESET：");
    if (confirmationText !== 'RESET') {
        alert("輸入字串不符，操作已終止。");
        return;
    }

    toggleLoading(true);
    try {
        const { error } = await _supabase.from('students')
            .update({ role: '一般學生' })
            .neq('student_id', '0');

        toggleLoading(false);
        if (error) {
            alert("批次更新失敗：" + error.message);
        } else {
            alert("全體學生身分已重設。");
        }
    } catch (err) {
        toggleLoading(false);
        console.error("重設角色異常", err);
    }
}

function editArea(targetId) {
    const targetArea = allAreas.find(item => item.id === targetId);
    if (!targetArea) return;

    document.getElementById('a-id').value = targetArea.id;
    document.getElementById('a-loc').value = targetArea.location;
    document.getElementById('a-cls').value = targetArea.class_name;
    document.getElementById('a-max').value = targetArea.max_count;

    const saveBtn = document.getElementById('btn-save-area');
    if (saveBtn) saveBtn.innerText = '提交修改設定';

    const cancelBtn = document.getElementById('btn-cancel-edit');
    if (cancelBtn) cancelBtn.classList.remove('hidden');
}

function cancelEditArea() {
    document.getElementById('a-id').value = '';
    document.getElementById('a-loc').value = '';
    document.getElementById('a-cls').value = '';
    document.getElementById('a-max').value = '';

    const saveBtn = document.getElementById('btn-save-area');
    if (saveBtn) saveBtn.innerText = '儲存新增掃區';

    const cancelBtn = document.getElementById('btn-cancel-edit');
    if (cancelBtn) cancelBtn.classList.add('hidden');
}

async function saveArea() {
    const idValue = document.getElementById('a-id').value;
    const locationValue = document.getElementById('a-loc').value;
    const classValue = document.getElementById('a-cls').value;
    const maxValue = document.getElementById('a-max').value;

    if (!locationValue || !classValue) {
        alert("掃區地點與負責班級為必填項目。");
        return;
    }

    toggleLoading(true);
    try {
        const payloadData = {
            location: locationValue,
            class_name: classValue,
            max_count: parseInt(maxValue, 10) || 1
        };

        let responseObj;
        if (idValue) {
            responseObj = await _supabase.from('areas').update(payloadData).eq('id', idValue);
        } else {
            responseObj = await _supabase.from('areas').insert([payloadData]);
        }

        toggleLoading(false);
        if (responseObj.error) {
            alert("掃區資料儲存失敗：" + responseObj.error.message);
        } else {
            cancelEditArea();
            await refreshAdminPanel();
        }
    } catch (err) {
        toggleLoading(false);
        console.error("儲存掃區發生例外", err);
    }
}

async function deleteArea(targetId) {
    const isConfirmed = confirm('刪除該掃區將會導致此掃區的學生登記紀錄消失。確定刪除？');
    if (!isConfirmed) return;

    toggleLoading(true);
    try {
        await _supabase.from('areas').delete().eq('id', targetId);
        toggleLoading(false);
        await refreshAdminPanel();
    } catch (err) {
        toggleLoading(false);
        console.error("刪除掃區失敗", err);
    }
}

async function handleClearData(targetEntityName) {
    const userPrompt = prompt(`您正在請求清空所有的「${targetEntityName}」。此步驟無法復原。\n請輸入大寫字串 RESET 以刪除：`);
    if (userPrompt !== 'RESET') {
        alert("授權驗證碼不符，刪除程序已安全中止。");
        return;
    }

    toggleLoading(true);
    try {
        let databaseTableName = '';
        if (targetEntityName === '登記紀錄') {
            databaseTableName = 'registrations';
        } else if (targetEntityName === '點名紀錄') {
            databaseTableName = 'attendance';
        } else if (targetEntityName === '掃區紀錄') {
            databaseTableName = 'areas';
        }

        if (databaseTableName) {
            const { error } = await _supabase.from(databaseTableName).delete().neq('id', 0);
            if (error) throw error;
        }

        toggleLoading(false);
        alert(`${targetEntityName}已全數刪除。`);
        await refreshAdminPanel();
    } catch (err) {
        toggleLoading(false);
        console.error("執行作業時失敗", err);
        alert("資料庫刪除作業失敗。");
    }
}

async function refreshAdminPanel() {
    toggleLoading(true);
    try {
        const [areasResponse, regsResponse, annsResponse] = await Promise.all([
            _supabase.from('areas').select('*').order('class_name'),
            _supabase.from('registrations').select('*'),
            _supabase.from('announcements').select('*').order('created_at', { ascending: false })
        ]);

        toggleLoading(false);

        allAreas = areasResponse.data || [];
        const allRegistrations = regsResponse.data || [];
        const allAnnouncements = annsResponse.data || [];

        // 1. 渲染全校分配詳情表格
        const statusListContainer = document.getElementById('admin-area-status-list');
        if (statusListContainer) {
            let statusHtmlContent = '';
            for (let idx = 0; idx < allAreas.length; idx++) {
                const currentArea = allAreas[idx];
                const matchedStudents = [];
                for (let r = 0; r < allRegistrations.length; r++) {
                    if (allRegistrations[r].area_id === currentArea.id) {
                        matchedStudents.push(allRegistrations[r]);
                    }
                }

                const remainingCount = currentArea.max_count - matchedStudents.length;

                let studentsTagHtml = '';
                for (let ms = 0; ms < matchedStudents.length; ms++) {
                    const stuRec = matchedStudents[ms];
                    const isOk = stuRec.status === '合格';
                    const fontColor = isOk ? 'text-emerald-700' : 'text-slate-500';
                    const currentStat = stuRec.status || '等待審核';
                    const displayLabel = String(currentArea.class_name) === '000'
                        ? `${stuRec.class_name}班${stuRec.seat_number}號`
                        : `座號 ${stuRec.seat_number} 號`;
                    studentsTagHtml += `
                        <span class="inline-block bg-slate-50 border border-slate-200 rounded px-2 py-1 m-1 text-xs">
                            ${displayLabel} <b class="${fontColor}">[狀態：${currentStat}]</b>
                        </span>
                    `;
                }

                if (studentsTagHtml === '') {
                    studentsTagHtml = '<span class="text-slate-400 text-xs italic bg-slate-50 px-2 py-1 rounded">無學生分配至此區</span>';
                }

                const remainColorClass = remainingCount <= 0 ? 'text-rose-600' : 'text-emerald-600';

                statusHtmlContent += `
                    <tr class="border-b hover:bg-slate-50 transition">
                        <td class="p-4 align-top">
                            <div class="font-bold text-slate-800 text-base">${currentArea.location}</div>
                            <div class="text-blue-600 text-xs font-bold mt-1">負責班級：${currentArea.class_name} 班</div>
                        </td>
                        <td class="p-4">
                            <div class="flex flex-wrap gap-1">${studentsTagHtml}</div>
                        </td>
                        <td class="p-4 text-center align-middle">
                            <div class="font-mono text-sm bg-slate-100 py-2 rounded-xl border border-slate-200">
                                尚餘 <b class="${remainColorClass} text-base">${remainingCount}</b> 員額
                                <div class="text-[10px] text-slate-400 mt-1">滿編需求：${currentArea.max_count} 人</div>
                            </div>
                        </td>
                    </tr>
                `;
            }
            statusListContainer.innerHTML = statusHtmlContent;
        }

        // 2. 渲染掃區清單增刪改管理表格
        const areaManageContainer = document.getElementById('admin-area-list');
        if (areaManageContainer) {
            let areaManageHtml = '';
            for (let j = 0; j < allAreas.length; j++) {
                const aItem = allAreas[j];
                areaManageHtml += `
                    <tr class="border-b hover:bg-slate-50 transition">
                        <td class="p-3">
                            <span class="font-bold text-slate-700">${aItem.location}</span> 
                            <span class="text-blue-600 text-xs ml-2 bg-blue-50 px-2 py-0.5 rounded">指定班級：${aItem.class_name} 班</span>
                        </td>
                        <td class="p-3 text-right">
                            <button onclick="editArea(${aItem.id})" class="text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-lg mr-2 text-xs font-bold transition">編輯</button>
                            <button onclick="deleteArea(${aItem.id})" class="text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1 rounded-lg text-xs font-bold transition">刪除項目</button>
                        </td>
                    </tr>
                `;
            }
            areaManageContainer.innerHTML = areaManageHtml;
        }

        // 3. 渲染後台公告列表清單
        const annManageContainer = document.getElementById('admin-ann-list');
        if (annManageContainer) {
            let annManageHtml = '';
            for (let i = 0; i < allAnnouncements.length; i++) {
                const annItem = allAnnouncements[i];
                annManageHtml += `
                    <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm mb-2 hover:bg-white transition shadow-sm">
                        <div class="truncate pr-4 flex-grow font-bold text-slate-700">標題：${annItem.title}</div>
                        <div class="flex gap-2">
                            <button onclick="editAnnouncement(${annItem.id})" class="text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-lg text-xs font-bold transition">編輯</button>
                            <button onclick="deleteAnnouncement(${annItem.id})" class="text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg text-xs font-bold border border-rose-200 transition">刪除公告</button>
                        </div>
                    </div>
                `;
            }
            annManageContainer.innerHTML = annManageHtml;
        }
        await loadClassPasswords();
    } catch (error) {
        toggleLoading(false);
        console.error("載入管理員面板資料失敗", error);
        alert(`儀表板資料同步失敗：${error?.message || error}`);
    }
}

function toggleLicense(showStatus) {
    const modalElement = document.getElementById('license-modal');
    if (modalElement) {
        if (showStatus) {
            modalElement.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        } else {
            modalElement.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }
}

function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const length = Math.floor(Math.random() * 3) + 4; 
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const passwordInput = document.getElementById('cp-password');
    if (passwordInput) {
        passwordInput.value = result;
    }
}

async function saveClassPassword() {
    const cls = document.getElementById('cp-class').value.trim();
    const pwd = document.getElementById('cp-password').value.trim();

    if (!cls || !pwd) {
        alert("請填寫班級與通行碼。");
        return;
    }

    toggleLoading(true);
    const { error } = await _supabase.from('settings')
        .upsert({ key: `class_${cls}`, value: pwd }, { onConflict: 'key' });
    toggleLoading(false);

    if (error) {
        alert("儲存失敗：" + error.message);
    } else {
        document.getElementById('cp-class').value = '';
        document.getElementById('cp-password').value = '';
        await loadClassPasswords();
        alert("通行碼設定成功。");
    }
}

async function loadClassPasswords() {
    const { data, error } = await _supabase.from('settings')
        .select('*')
        .like('key', 'class_%')
        .order('key');

    const container = document.getElementById('cp-list');
    if (!container || error) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400">尚未設定任何班級通行碼。</p>';
        return;
    }

    let html = '';
    for (const item of data) {
        const className = item.key.replace('class_', '');
        html += `
            <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl border text-sm">
                <span class="font-bold">${className} 班</span>
                <span class="font-mono text-slate-500">${item.value}</span>
                <button onclick="deleteClassPassword('${item.key}')" 
                    class="text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg text-xs font-bold border border-rose-200 transition">刪除</button>
            </div>
        `;
    }
    container.innerHTML = html;
}

async function deleteClassPassword(key) {
    const cls = key.replace('class_', '');
    if (!confirm(`確定刪除 ${cls} 班的通行碼？`)) return;
    toggleLoading(true);
    await _supabase.from('settings').delete().eq('key', key);
    toggleLoading(false);
    await loadClassPasswords();
}
