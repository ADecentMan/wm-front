document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-list a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetUrl = getTargetUrl(targetId);
            
            if (targetUrl) {
                window.location.href = targetUrl;
            } else {
                console.log('导航到:', targetId);
                // 这里可以添加页面内导航逻辑
            }
        });
    });
    
    function getTargetUrl(targetId) {
        const urlMap = {
            'home': '../index.html',
            'music': '../music/music.html',
            'story': '../story/story.html',
            'entertainment': '../chickenQuestion.html',
            'login': '../login/login.html'
        };
        
        return urlMap[targetId] || null;
    }
    
    // 添加页面加载动画
    const container = document.querySelector('.container');
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        container.style.transition = 'all 0.6s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 100);
});