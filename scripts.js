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
            <h2 class="text-xl font-bold mb-4 text-amber-600">系統公告發佈管理</h2>
            <div class="grid grid-cols-1 gap-3">
                <input type="text" id="ann-title" placeholder="請輸入公告標題" class="border p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500">
                <textarea id="ann-content" placeholder="請輸入公告詳細內容..." class="border p-3 rounded-xl text-sm h-24 outline-none focus:ring-2 focus:ring-amber-500"></textarea>
                <button onclick="saveAnnouncement()" class="bg-amber-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md self-start hover:bg-amber-600 transition">發佈公告</button>
            </div>
            <div id="admin-ann-list" class="mt-4 space-y-2 border-t pt-4">
                </div>
        </div>

        <div class="bg-white p-6 rounded-3xl border shadow-sm">
            <h2 class="text-xl font-bold mb-4 text-blue-700">全校掃區分配詳情清單</h2>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-50 border-b">
                        <tr>
                            <th class="p-4">打掃地點 (負責班級)</th>
                            <th class="p-4">已分配學生名單與狀態</th>
                            <th class="p-4 text-center">剩餘名額狀況</th>
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
                <table class="w-full text-left text-sm">
                    <tbody id="roll-list"></tbody>
                </table>
            </div>
        </div>

        <div class="bg-white p-6 rounded-3xl border shadow-sm">
            <h2 class="text-xl font-bold mb-4 text-slate-700">學生權限與糾察身分設定</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="number" id="m-cls" placeholder="學生班級 (例如 101)" class="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                <input type="number" id="m-seat" placeholder="學生座號 (例如 1)" class="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                <select id="m-role" class="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="一般學生">一般學生</option>
                    <option value="衛生糾察">衛生糾察</option>
                    <option value="環境糾察">環境糾察</option>
                </select>
            </div>
            <button onclick="saveStudentRole()" class="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition">更新學生身分</button>
        </div>

        <div class="bg-white p-6 rounded-3xl border shadow-sm">
            <h2 class="text-xl font-bold mb-4 font-mono">系統掃區清單設定 (新增/修改/刪除)</h2>
            <input type="hidden" id="a-id">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                <input type="text" id="a-loc" placeholder="掃區地點名稱" class="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-800">
                <input type="text" id="a-cls" placeholder="負責班級代碼" class="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-800">
                <input type="number" id="a-max" placeholder="需求人數上限" class="border p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-800">
            </div>
            <div class="flex gap-2">
                <button id="btn-save-area" onclick="saveArea()" class="bg-slate-800 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-900 transition">儲存掃區資料</button>
                <button id="btn-cancel-edit" onclick="cancelEditArea()" class="hidden bg-slate-200 text-slate-600 px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-300 transition">取消目前編輯</button>
            </div>
            <div class="mt-6 overflow-x-auto">
                <table class="w-full text-xs text-left">
                    <tbody id="admin-area-list"></tbody>
                </table>
            </div>
        </div>

        <div class="p-6 bg-rose-50 rounded-3xl border border-rose-200">
            <h3 class="text-lg font-bold text-rose-700 mb-2">系統危險操作區 (資料重設)</h3>
            <p class="text-xs text-rose-600 mb-4">警告：以下操作將永久刪除資料庫中的紀錄，執行前系統將要求輸入驗證碼。</p>
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

/**
 * 將班級與座號轉換為系統標準學號 (SID)
 * @param {string|number} cls - 班級 (例如 101)
 * @param {string|number} seat - 座號 (例如 1)
 * @returns {string} 計算後的六位數學號
 */
function calculateSid(cls, seat) {
    const baseId = 411001;
    const classIndex = parseInt(cls, 10) - 101;
    const seatIndex = parseInt(seat, 10) - 1;
    const calculatedId = baseId + (classIndex * 36) + seatIndex;
    return calculatedId.toString();
}

/**
 * 將 ISO 格式的時間字串格式化為易讀的日期時間
 * @param {string} isoString - 資料庫回傳的時間字串
 * @returns {string} 格式化後的時間 (YYYY/MM/DD HH:MM)
 */
function formatDateTime(isoString) {
    if (!isoString) return '尚無紀錄';
    const dateObj = new Date(isoString);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * 控制全局讀取動畫的顯示與隱藏
 * @param {boolean} show - true 為顯示，false 為隱藏
 */
function toggleLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.classList.toggle('active', show);
    }
}

/**
 * 呼叫 Supabase 後端 RPC 函式以進行安全驗證
 * @param {string} key - 欲驗證的設定鍵值 (例如 'password')
 * @param {string} input - 使用者輸入的字串
 * @returns {Promise<boolean>} 驗證是否成功
 */
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

/* ==========================================
 * 分頁與狀態控制邏輯 (Navigation & State)
 * ========================================== */

/**
 * 處理網頁分頁切換邏輯，並依據目標分頁載入對應資料
 * @param {string} tab - 目標分頁代碼 ('query', 'allocation', 'inspector', 'admin')
 */
async function switchTab(tab) {
    if (tab === 'allocation') {
        const inputPw = prompt("本頁面僅限衛生股長操作，請輸入股長通行碼：");
        if (!inputPw) return; // 使用者按取消或沒輸入則不跳轉

        toggleLoading(true);
        const isAuthorized = await verifyRpc('password1', inputPw);
        toggleLoading(false);

        if (!isAuthorized) {
            alert("授權失敗：股長通行碼輸入錯誤，無法進入分配系統。");
            return; // 驗證失敗，停留在原頁面
        }

        // 驗證成功，將密碼填入隱藏欄位，供 handleAllocation 使用
        const passcodeField = document.getElementById('alloc-passcode');
        if (passcodeField) {
            passcodeField.value = inputPw;
        }
    }
    if (tab === 'inspector') {
        const inputPw = prompt("本頁面僅限糾察操作，請輸入糾察授權密碼：");
        if (!inputPw) return;

        toggleLoading(true);
        // 注意：這裡 RPC 驗證的 key 是 'password' (原本代碼中的糾察密碼 key)
        const isAuthorized = await verifyRpc('password', inputPw);
        toggleLoading(false);

        if (!isAuthorized) {
            alert("驗證失敗：糾察密碼錯誤。");
            return;
        }

        // 驗證成功，將密碼填入原本的 inspector-pwd 欄位 (可設為隱藏)
        // --- 關鍵修正區 ---
        const inspectorField = document.getElementById('inspector-pwd');
        if (inspectorField) {
            inspectorField.value = inputPw;
            console.log("密碼已填入隱藏欄位，準備執行資料抓取");
        } else {
            // 如果 HTML 還沒渲染出來，這裡會抓不到
            console.error("錯誤：找不到 id='inspector-pwd' 的元素");
        }
    }
    // 針對管理員分頁進行身分攔截與驗證
    if (tab === 'admin') {
        const { data: authData } = await _supabase.auth.getSession();
        if (!authData.session) {
            const email = prompt("系統管理員身分驗證，請輸入註冊的電子郵件：");
            if (!email) return;

            const pwd = prompt("請輸入系統管理員密碼：");
            if (!pwd) return;

            toggleLoading(true);
            const { error: signInError } = await _supabase.auth.signInWithPassword({ email: email, password: pwd });
            toggleLoading(false);

            if (signInError) {
                alert("驗證拒絕：電子郵件或密碼輸入錯誤，請重新嘗試。");
                return;
            }
        }

        // 驗證成功後注入管理員介面 HTML
        const adminView = document.getElementById('view-admin');
        if (adminView && adminView.innerHTML.trim() === "") {
            adminView.innerHTML = ADMIN_HTML;
        }
    }

    // 隱藏所有分頁內容
    const allViews = document.querySelectorAll('.tab-view');
    for (let i = 0; i < allViews.length; i++) {
        allViews[i].classList.add('hidden');
    }

    // 顯示指定的目標分頁
    const targetView = document.getElementById(`view-${tab}`);
    if (targetView) {
        targetView.classList.remove('hidden');
    }

    // 重設導覽列按鈕樣式
    const navButtons = document.querySelectorAll('nav button');
    for (let j = 0; j < navButtons.length; j++) {
        navButtons[j].classList.remove('tab-active', 'text-blue-600', 'border-blue-600');
        navButtons[j].classList.add('text-slate-500', 'border-transparent');
    }

    // 突顯當前選擇的導覽按鈕
    const targetButton = document.getElementById(`tab-${tab}`);
    if (targetButton) {
        targetButton.classList.add('tab-active', 'text-blue-600', 'border-blue-600');
        targetButton.classList.remove('text-slate-500', 'border-transparent');
    }

    // 依據目標分頁觸發對應的資料更新函式
    if (tab === 'query') {
        await fetchAnnouncements();
    } else if (tab === 'allocation') {
        await fetchAreas();
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
    const isConfirmed = confirm("即將登出系統管理員身分並鎖定後台，確定執行？");
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

/**
 * 自資料庫取得最新公告並渲染至首頁
 */
async function fetchAnnouncements() {
    try {
        const { data, error } = await _supabase.from('announcements')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const board = document.getElementById('bulletin-board');
        if (!board) return;

        if (!data || data.length === 0) {
            board.innerHTML = '<p class="text-center text-slate-400 py-6 text-sm col-span-full">系統目前尚無任何公告事項發佈。</p>';
            return;
        }

        let htmlContent = '';
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            htmlContent += `
                <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm animate-fade">
                    <h4 class="font-black text-slate-800 mb-1 leading-tight">[公告] ${item.title}</h4>
                    <p class="text-sm text-slate-500 whitespace-pre-wrap">${item.content}</p>
                    <div class="text-[10px] text-slate-300 mt-3 font-mono uppercase">發佈時間：${formatDateTime(item.created_at)}</div>
                </div>
            `;
        }
        board.innerHTML = htmlContent;
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
        alert("格式錯誤：請輸入完整的六位數字學號。");
        return;
    }

    toggleLoading(true);
    const resBox = document.getElementById('query-result');

    try {
        // 第一階段：查詢學生基本資料與班級座號
        const { data: studentData, error: stuError } = await _supabase.from('students')
            .select('*')
            .eq('student_id', sid)
            .single();

        if (stuError || !studentData) {
            toggleLoading(false);
            alert("查無結果：資料庫中找不到此學號，請確認輸入無誤。");
            return;
        }

        // 第二階段：依據班級座號查詢分配紀錄
        const { data: regData } = await _supabase.from('registrations')
            .select('*')
            .eq('class_name', studentData.class_name)
            .eq('seat_number', studentData.seat_number)
            .limit(1);

        // 第三階段：查詢點名簽到退紀錄
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
            currentStatus = currentRegistration.status || '等待糾察覆核中';
        }

        // 渲染結果區塊
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

/**
 * 自資料庫取得全校掃區清單，計算剩餘名額並渲染至下拉選單
 */
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
        for (let k = 0; k < allAreas.length; k++) {
            const areaItem = allAreas[k];
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
        alert("無法取得最新掃區名額資料，請重整網頁。");
    }
}

/**
 * 處理衛生股長提交掃區分配的請求
 */
async function handleAllocation() {
    const clsValue = document.getElementById('stu-class').value;
    const seatValue = document.getElementById('stu-seat').value;
    const areaIdValue = document.getElementById('stu-area').value;
    const passcodeValue = document.getElementById('alloc-passcode').value;

    if (!clsValue || !seatValue || !areaIdValue) {
        alert("操作拒絕：請完整填寫班級與座號。");
        return;
    }

    toggleLoading(true);

    try {
        const isAuthorized = await verifyRpc('password1', passcodeValue);
        if (!isAuthorized) {
            toggleLoading(false);
            alert("授權過期或通行碼錯誤，請重新整理網頁後登入。");
            return;
        }

        const selectedArea = allAreas.find(area => String(area.id) === areaIdValue);
        if (!selectedArea) {
            toggleLoading(false);
            alert("系統錯誤：找不到對應的掃區資料。");
            return;
        }

        if (String(selectedArea.class_name) !== '000' && String(selectedArea.class_name) !== clsValue) {
            toggleLoading(false);
            alert(`分配限制攔截：所選之掃區僅開放給「${selectedArea.class_name}」班級的學生。`);
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
            alert("寫入失敗：該名學生可能已有紀錄，或名額已滿。");
        } else {
            alert("分配作業成功！");
            await fetchAreas();
            await fetchAllocations(); // 新增
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

    const { data, error } = await _supabase.from('registrations')
        .select('*')
        .eq('class_name', clsValue)
        .order('seat_number');

    const listBox = document.getElementById('alloc-list');
    if (!listBox) return;

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
    
    if (String(regClass) !== String(clsValue)) {
        alert("操作拒絕：只能刪除本班的登記紀錄。");
        return;
    }
    
    const isConfirmed = confirm("確定要刪除此筆登記紀錄嗎？");
    if (!isConfirmed) return;

    const passcodeValue = document.getElementById('alloc-passcode').value;
    toggleLoading(true);

    const isAuthorized = await verifyRpc('password1', passcodeValue);
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

/**
 * 取得待覆核資料，並依據掃區進行群組化渲染
 */
async function fetchRegistrationsByArea() {
    toggleLoading(true);
    try {
        if (allAreas.length === 0) {
            await fetchAreas();
        }

        const { data: registrationsData, error: regsError } = await _supabase.from('registrations')
            .select('*');

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
            listContainer.innerHTML = '<tr><td class="p-10 text-center text-slate-400">目前全校所有區域皆已完成覆核作業。</td></tr>';
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
                namesStringArray.push(`<span class="${colorClass}">${stu.seat_number}號${tag}</span>`);
            }
            const namesDisplay = namesStringArray.join('、');

            let actionButtonsHtml = '';
            // --- 修正重點 1: 參數加上單引號，避免長字串導致 JS 崩潰 ---
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

/**
 * 批次更新指定區域內所有學生的審核狀態
 * @param {number} areaId - 掃區的資料庫 ID
 * @param {string} targetStatus - 欲更新的狀態字串 ('合格' 或是 '需重掃')
 */
async function auditArea(areaId, targetStatus) {
    const inspectorPwField = document.getElementById('inspector-pwd');
    const pwdValue = inspectorPwField ? inspectorPwField.value : '';

    if (!pwdValue) {
        alert("操作拒絕：尚未取得糾察授權。請重新進入分頁以觸發密碼驗證。");
        return;
    }

    toggleLoading(true);

    try {
        // 2. 呼叫 RPC 進行安全性二次驗證 (Key 為 'password')
        const isAuthorized = await verifyRpc('password', pwdValue);
        if (!isAuthorized) {
            toggleLoading(false);
            alert("授權過期或驗證失敗：糾察密碼錯誤，拒絕寫入。");
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
            // 4. 更新成功後，重新抓取並渲染覆核清單
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

/**
 * 儲存並發佈新的系統公告
 */
async function saveAnnouncement() {
    const titleElement = document.getElementById('ann-title');
    const contentElement = document.getElementById('ann-content');
    if (!titleElement || !contentElement) return;

    const titleStr = titleElement.value.trim();
    const contentStr = contentElement.value.trim();

    if (!titleStr) {
        alert("發佈失敗：公告標題不得為空白。");
        return;
    }

    toggleLoading(true);
    try {
        const { error } = await _supabase.from('announcements')
            .insert([{ title: titleStr, content: contentStr }]);

        toggleLoading(false);

        if (error) {
            alert("寫入公告失敗：" + error.message);
        } else {
            titleElement.value = '';
            contentElement.value = '';
            await fetchAnnouncements();
            await refreshAdminPanel();
            alert("系統提示：公告發佈成功。");
        }
    } catch (err) {
        toggleLoading(false);
        console.error(err);
    }
}

/**
 * 根據 ID 刪除指定的系統公告
 * @param {number} announcementId - 公告的資料庫 ID
 */
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

/**
 * 比對全校名單與點名紀錄，產生並下載未簽退學生的 CSV 檔案
 */
async function downloadAbsentees() {
    const sessionTarget = prompt("請輸入欲匯出名單的目標梯次名稱 (例如：第一次返校)：", "第一次返校");
    if (!sessionTarget) return;

    toggleLoading(true);
    try {
        // 抓取全體學生名單
        const { data: allStudents, error: stuErr } = await _supabase.from('students').select('*');
        if (stuErr) throw stuErr;

        // 抓取在該梯次已經有 'check_out' 時間紀錄的學生 ID
        const { data: presentLogs, error: logErr } = await _supabase.from('attendance')
            .select('student_id')
            .eq('session_type', sessionTarget)
            .not('check_out', 'is', null);

        if (logErr) throw logErr;
        toggleLoading(false);

        // 將已簽退的學生 ID 轉換為 Set 結構以加速比對效能
        const attendedIdSet = new Set();
        for (let idx = 0; idx < presentLogs.length; idx++) {
            attendedIdSet.add(presentLogs[idx].student_id);
        }

        // 過濾出尚未簽退的學生
        const absenteeList = [];
        for (let idx = 0; idx < allStudents.length; idx++) {
            if (!attendedIdSet.has(allStudents[idx].student_id)) {
                absenteeList.push(allStudents[idx]);
            }
        }

        // 建立 CSV 內容 (加入 BOM 以支援 Excel 中文顯示)
        let csvString = "\ufeff班級,座號,系統學號,系統角色\n";
        for (let k = 0; k < absenteeList.length; k++) {
            const abs = absenteeList[k];
            csvString += `${abs.class_name},${abs.seat_number},${abs.student_id},${abs.role}\n`;
        }

        // 觸發瀏覽器下載行為
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

/**
 * 根據輸入條件(班級或學號)載入學生清單以供手動點名操作
 */
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

        // 判斷是使用學號精確查詢，還是使用班級陣列查詢
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

/**
 * 執行紀錄單一學生的簽到或簽退時間
 * @param {string} sid - 學生標準學號
 * @param {string} actionType - 'in' 代表簽到，'out' 代表簽退
 */
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

        // 使用 upsert 進行資料的新增或更新，透過 student_id 與 session_type 作為衝突判斷基準
        const { error } = await _supabase.from('attendance')
            .upsert(payloadObject, { onConflict: 'student_id, session_type' });

        toggleLoading(false);
        if (error) {
            console.error("寫入點名資料庫失敗", error);
            alert("寫入失敗，請重試。");
        } else {
            // 寫入成功後自動重載清單以更新畫面時間
            await loadRollCall();
        }
    } catch (err) {
        toggleLoading(false);
        console.error("點名邏輯異常", err);
    }
}


/**
 * 更新單一學生的系統角色權限
 * 修正：直接使用輸入的班級與座號進行資料庫更新，捨棄不穩定的學號推算
 */
async function saveStudentRole() {
    const classInput = document.getElementById('m-cls').value.trim();
    const seatInput = document.getElementById('m-seat').value.trim();
    const roleSelect = document.getElementById('m-role').value;

    if (!classInput || !seatInput) {
        alert("操作中斷：請填寫目標班級與座號資訊。");
        return;
    }

    toggleLoading(true);
    try {
        // 直接使用 class_name 與 seat_number 作為雙重鎖定條件
        const { data, error } = await _supabase.from('students')
            .update({ role: roleSelect })
            .eq('class_name', classInput)
            .eq('seat_number', seatInput)
            .select();

        toggleLoading(false);

        if (error) {
            alert("資料庫更新拒絕：" + error.message);
        } else if (!data || data.length === 0) {
            alert("更新無效：資料庫中查無此「班級」與「座號」的學生紀錄，請確認輸入是否正確。");
        } else {
            // 更新成功，清空座號欄位方便連續輸入
            document.getElementById('m-seat').value = '';
            alert(`系統通知：已成功將 ${classInput} 班 ${seatInput} 號的身分更新為「${roleSelect}」。`);
        }
    } catch (err) {
        toggleLoading(false);
        console.error("身分更新失敗", err);
        alert("系統執行時發生異常狀況。");
    }
}

/**
 * 將系統內所有學生的角色統一重設為「一般學生」
 */
async function resetAllRoles() {
    const confirmationText = prompt("重大操作警告：此動作將把全體學生的身分強制覆寫為「一般學生」。若確認執行，請輸入字串 RESET：");
    if (confirmationText !== 'RESET') {
        alert("安全機制啟動：輸入字串不符，操作已強制終止。");
        return;
    }

    toggleLoading(true);
    try {
        // 利用不等於條件進行全表大量更新
        const { error } = await _supabase.from('students')
            .update({ role: '一般學生' })
            .neq('student_id', '0');

        toggleLoading(false);
        if (error) {
            alert("批次更新失敗：" + error.message);
        } else {
            alert("執行完畢：全體學生身分已重設。");
        }
    } catch (err) {
        toggleLoading(false);
        console.error("重設角色異常", err);
    }
}

/**
 * 進入掃區資料編輯模式，將選定資料填入表單欄位
 * @param {number} targetId - 欲編輯的掃區資料庫 ID
 */
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

/**
 * 退出掃區資料編輯模式，清空表單
 */
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

/**
 * 儲存掃區表單的變更 (包含新增與修改邏輯)
 */
async function saveArea() {
    const idValue = document.getElementById('a-id').value;
    const locationValue = document.getElementById('a-loc').value;
    const classValue = document.getElementById('a-cls').value;
    const maxValue = document.getElementById('a-max').value;

    if (!locationValue || !classValue) {
        alert("欄位檢查未通過：掃區地點與負責班級為必填項目。");
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
            // 執行更新指令
            responseObj = await _supabase.from('areas').update(payloadData).eq('id', idValue);
        } else {
            // 執行插入指令
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

/**
 * 刪除指定的掃區項目
 * @param {number} targetId - 欲刪除的掃區資料庫 ID
 */
async function deleteArea(targetId) {
    const isConfirmed = confirm('連鎖效應警告：刪除該掃區將會導致依附於此掃區的學生登記紀錄失效。確定仍要繼續執行刪除？');
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

/**
 * 處理危險資料庫清理作業 (透過使用者輸入字串確認)
 * @param {string} targetEntityName - 欲清理的目標識別字串 ('登記紀錄', '點名紀錄', '掃區紀錄')
 */
async function handleClearData(targetEntityName) {
    const userPrompt = prompt(`【危險動作驗證程序】\n您正在請求清空全校所有的「${targetEntityName}」。此步驟無法復原。\n請輸入大寫字串 RESET 以解除防護鎖定並執行刪除：`);
    if (userPrompt !== 'RESET') {
        alert("防護機制：授權驗證碼不符，刪除程序已安全中止。");
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
        alert(`系統資料庫回報：指定的 ${targetEntityName} 資料表內容已全數抹除乾淨。`);
        await refreshAdminPanel();
    } catch (err) {
        toggleLoading(false);
        console.error("執行危險清理作業時失敗", err);
        alert("資料庫刪除作業失敗。");
    }
}

/**
 * 重新載入並渲染管理員面板內的所有統計資料與管理表格
 */
async function refreshAdminPanel() {
    toggleLoading(true);
    try {
        // 並發請求多個資料表以減少等待時間
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
                    studentsTagHtml += `
                        <span class="inline-block bg-slate-50 border border-slate-200 rounded px-2 py-1 m-1 text-xs">
                            座號 ${stuRec.seat_number} 號 <b class="${fontColor}">[狀態：${currentStat}]</b>
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
                            <button onclick="editArea(${aItem.id})" class="text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-lg mr-2 text-xs font-bold transition">呼叫編輯</button>
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
                        <button onclick="deleteAnnouncement(${annItem.id})" class="text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg text-xs font-bold border border-rose-200 transition">刪除公告</button>
                    </div>
                `;
            }
            annManageContainer.innerHTML = annManageHtml;
        }

    } catch (error) {
        toggleLoading(false);
        console.error("載入管理員面板資料失敗", error);
        alert("儀表板資料同步失敗，部分功能可能無法正常顯示。");
    }
}

/**
 * 控制條款與免責聲明 Modal 視窗的顯示狀態
 * @param {boolean} showStatus - true 為顯示 Modal，false 為關閉
 */
function toggleLicense(showStatus) {
    const modalElement = document.getElementById('license-modal');
    if (modalElement) {
        if (showStatus) {
            modalElement.classList.remove('hidden');
            // 鎖定背景視窗捲動，提升瀏覽體驗
            document.body.style.overflow = 'hidden';
        } else {
            modalElement.classList.add('hidden');
            // 恢復背景捲動
            document.body.style.overflow = 'auto';
        }
    }
}
