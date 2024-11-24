document.addEventListener('DOMContentLoaded', function() {
    const gridItems = document.querySelectorAll('.grid-item');
    
    gridItems.forEach(item => {
        item.addEventListener('click', function() {
            const designType = this.getAttribute('data-type');
            // 跳转到设计页面
            window.location.href = `design.html?type=${designType}`;
        });
    });
}); 