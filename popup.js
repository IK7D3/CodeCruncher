document.addEventListener('DOMContentLoaded', () => {
    const solveBtn = document.getElementById('solveBtn');
    const statusContainer = document.getElementById('status');
    const loader = document.getElementById('loader');

    const addStatus = (message, isError = false) => {
        const p = document.createElement('p');
        p.textContent = message;
        p.className = 'status-item';
        if (isError) {
            p.style.color = 'var(--error-color)';
        }
        statusContainer.appendChild(p);
    };
    
    // This function handles the full process: scrape, send to backend, and download Python file.
    const handleSolve = () => {
        solveBtn.disabled = true;
        statusContainer.innerHTML = '';
        loader.style.display = 'block';

        addStatus('۱. در حال استخراج اطلاعات سوال...');

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
                addStatus('خطا: تبی پیدا نشد!', true);
                loader.style.display = 'none';
                solveBtn.disabled = false;
                return;
            }

            chrome.tabs.sendMessage(tabs[0].id, { action: "SCRAPE_QUERA" }, async (response) => {
                if (chrome.runtime.lastError) {
                    addStatus(`خطا: ${chrome.runtime.lastError.message}`, true);
                    loader.style.display = 'none';
                    solveBtn.disabled = false;
                    return;
                }
                if (!response || !response.data) {
                    addStatus('خطا: سوالی در این صفحه پیدا نشد!', true);
                    loader.style.display = 'none';
                    solveBtn.disabled = false;
                    return;
                }
                
                addStatus('۲. ارسال اطلاعات به سرور...');
                const problemData = response.data;

                try {
                    const serverResponse = await fetch("http://127.0.0.1:8000/solve", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(problemData),
                    });

                    if (!serverResponse.ok) {
                        throw new Error(`پاسخ سرور ناموفق بود: ${serverResponse.statusText}`);
                    }

                    addStatus('۳. دریافت کد نهایی...');
                    const result = await serverResponse.json();
                    const solutionCode = result.solution_code;

                    addStatus('۴. آماده‌سازی فایل برای دانلود...');
                    const blob = new Blob([solutionCode], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "solution.py";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    addStatus('✅ دانلود با موفقیت انجام شد!');

                } catch (error) {
                    console.error("Error communicating with backend:", error);
                    addStatus(`خطا در ارتباط با سرور: ${error.message}`, true);
                } finally {
                    loader.style.display = 'none';
                    solveBtn.disabled = false;
                }
            });
        });
    };
    
    solveBtn.addEventListener('click', handleSolve);
});