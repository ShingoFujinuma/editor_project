const DEFAULT_DURATION_MS = 4000;

let nextNotificationId = 1;

const activeNotifications =
    new Map();

function getContainer() {
    return document.getElementById(
        "notification-container"
    );
}

function getNotificationIcon(type) {
    switch (type) {
        case "success":
            return "✓";

        case "warning":
            return "⚠";

        case "error":
            return "!";

        default:
            return "i";
    }
}

function createNotificationElement(
    notification
) {
    const element =
        document.createElement("div");

    element.className =
        "editor-notification "
        + `editor-notification-${notification.type}`;

    element.dataset.notificationId =
        String(notification.id);

    if (notification.type === "error") {
        element.setAttribute(
            "role",
            "alert"
        );
    } else {
        element.setAttribute(
            "role",
            "status"
        );
    }

    const icon =
        document.createElement("div");

    icon.className =
        "editor-notification-icon";

    icon.textContent =
        getNotificationIcon(
            notification.type
        );

    const content =
        document.createElement("div");

    content.className =
        "editor-notification-content";

    const title =
        document.createElement("div");

    title.className =
        "editor-notification-title";

    title.textContent =
        notification.title;

    const message =
        document.createElement("div");

    message.className =
        "editor-notification-message";

    message.textContent =
        notification.message;

    const closeButton =
        document.createElement("button");

    closeButton.type =
        "button";

    closeButton.className =
        "editor-notification-close";

    closeButton.textContent =
        "×";

    closeButton.setAttribute(
        "aria-label",
        "通知を閉じる"
    );

    closeButton.addEventListener(
        "click",
        () => {
            dismissNotification(
                notification.id
            );
        }
    );

    content.append(
        title,
        message
    );

    element.append(
        icon,
        content,
        closeButton
    );

    return element;
}

export function dismissNotification(id) {
    const active =
        activeNotifications.get(id);

    if (!active) {
        return;
    }

    if (active.timerId !== null) {
        window.clearTimeout(
            active.timerId
        );
    }

    active.element.classList.add(
        "editor-notification-removing"
    );

    window.setTimeout(
        () => {
            active.element.remove();

            activeNotifications.delete(
                id
            );
        },
        160
    );
}

export function showNotification({
    type = "info",
    title = "通知",
    message = "",
    duration = DEFAULT_DURATION_MS,
    persistent = false,
    key = null
}) {
    if (key !== null) {
        for (
            const [
                activeId,
                active
            ]
            of activeNotifications
        ) {
            if (active.key === key) {
                dismissNotification(
                    activeId
                );
            }
        }
    }

    const container =
        getContainer();

    if (!container) {
        console.error(
            "通知表示領域が見つかりません",
            {
                type,
                title,
                message
            }
        );

        return null;
    }

    const id =
        nextNotificationId;

    nextNotificationId += 1;

    const notification = {
        id,
        type,
        title:
            String(title),
        message:
            String(message)
    };

    const element =
        createNotificationElement(
            notification
        );

    container.appendChild(
        element
    );

    let timerId = null;

    if (
        !persistent &&
        Number.isFinite(duration) &&
        duration > 0
    ) {
        timerId =
            window.setTimeout(
                () => {
                    dismissNotification(id);
                },
                duration
            );
    }

    activeNotifications.set(
        id,
        {
            element,
            timerId,
            key
        }
    );

    return id;
}

export function showInfo(
    message,
    title = "情報"
) {
    return showNotification({
        type: "info",
        title,
        message
    });
}

export function showSuccess(
    message,
    title = "完了"
) {
    return showNotification({
        type: "success",
        title,
        message,
        duration: 3000
    });
}

export function showWarning(
    message,
    title = "注意"
) {
    return showNotification({
        type: "warning",
        title,
        message,
        duration: 6000
    });
}

export function showError(
    error,
    title = "エラー"
) {
    let message;

    if (error instanceof Error) {
        message =
            error.message;
    } else {
        message =
            String(error);
    }

    console.error(
        title,
        error
    );

    return showNotification({
        type: "error",
        title,
        message,
        persistent: true
    });
}

export function clearNotifications() {
    const ids =
        Array.from(
            activeNotifications.keys()
        );

    for (const id of ids) {
        dismissNotification(id);
    }
}

export function showWarningOnce(
    key,
    message,
    title = "注意"
) {
    return showNotification({
        type: "warning",
        title,
        message,
        duration: 3500,
        key
    });
}