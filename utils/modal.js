
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
