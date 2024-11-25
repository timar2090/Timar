document.addEventListener('DOMContentLoaded', function() {
    // 为所有设计项目添加点击事件
    document.querySelectorAll('.grid-item').forEach(item => {
        item.addEventListener('click', () => {
            const type = item.getAttribute('data-type');
            window.location.href = `design.html?type=${type}`;
        });
    });
}); 