

export function showWarningModal(message) {
    const modal = document.getElementById('warning-modal');
    const backdrop = document.getElementById('warning-modal-backdrop');
    const panel = document.getElementById('warning-modal-panel');
    const msgEl = document.getElementById('warning-modal-message');
    const closeBtn = document.getElementById('warning-modal-close');

    if (!modal || !backdrop || !panel || !msgEl) {
        alert(message);
        return;
    }

    msgEl.textContent = message;
    modal.classList.remove('hidden');

    requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('opacity-0', 'scale-95');
        panel.classList.add('opacity-100', 'scale-100');
    });

    const close = () => {
        backdrop.classList.add('opacity-0');
        panel.classList.remove('opacity-100', 'scale-100');
        panel.classList.add('opacity-0', 'scale-95');
        
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 200);
    };

    closeBtn.onclick = close;
}

export function showConfirmModal(message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const backdrop = document.getElementById('confirm-modal-backdrop');
    const panel = document.getElementById('confirm-modal-panel');
    const msgEl = document.getElementById('confirm-modal-message');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    const okBtn = document.getElementById('confirm-modal-ok');

    if (!modal) {
        if (confirm(message)) onConfirm();
        return;
    }

    msgEl.textContent = message;
    modal.classList.remove('hidden');

    requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('opacity-0', 'scale-95');
        panel.classList.add('opacity-100', 'scale-100');
    });

    const close = () => {
        backdrop.classList.add('opacity-0');
        panel.classList.remove('opacity-100', 'scale-100');
        panel.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            okBtn.onclick = null;
            cancelBtn.onclick = null;
        }, 200);
    };

    cancelBtn.onclick = close;
    
    okBtn.onclick = () => {
        onConfirm();
        close();
    };
}

export function showSolutionDetailModal(data) {
    const modal = document.getElementById('solution-detail-modal');
    const backdrop = document.getElementById('detail-modal-backdrop');
    const panel = document.getElementById('detail-modal-panel');
    const closeBtn = document.getElementById('detail-modal-close');

    if (!modal) return;

    // Populate Data
    document.getElementById('detail-name').textContent = data.name || '-';
    document.getElementById('detail-manufacturer').textContent = data.manufacturer || '제조사 미지정';
    document.getElementById('detail-share').textContent = `${data.share}%`;
    document.getElementById('detail-note').textContent = data.note || '내용 없음';

    const ppList = document.getElementById('detail-painpoints');
    ppList.innerHTML = '';
    if (data.painPoints && data.painPoints.length > 0) {
        data.painPoints.forEach(pp => {
            const li = document.createElement('li');
            li.className = "flex items-start gap-2 text-sm text-gray-400";
            li.innerHTML = `<span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span><span>${pp}</span>`;
            ppList.appendChild(li);
        });
    } else {
        ppList.innerHTML = '<li class="text-sm text-gray-500 italic">등록된 Pain-Point가 없습니다.</li>';
    }

    // Show
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('opacity-0', 'scale-95');
        panel.classList.add('opacity-100', 'scale-100');
    });

    const close = () => {
        backdrop.classList.add('opacity-0');
        panel.classList.remove('opacity-100', 'scale-100');
        panel.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 200);
    };

    closeBtn.onclick = close;
    backdrop.onclick = close;
}