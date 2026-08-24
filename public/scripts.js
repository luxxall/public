document.addEventListener('DOMContentLoaded', () => {
    // 1. Floating/Solid Navbar on Scroll
    const navbar = document.querySelector('.transition-navbar');
    
    if (navbar) {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        };

        // Initial check on load
        handleScroll();
        // Check on scroll
        window.addEventListener('scroll', handleScroll);
    }

    // 2. Scroll Animations (Intersection Observer)
    const revealElements = document.querySelectorAll('.reveal-up');

    if (revealElements.length > 0) {
        const revealOptions = {
            root: null, // viewport
            rootMargin: '0px 0px -10% 0px', // trigger slightly before it enters the viewport fully
            threshold: 0.1 // 10% of the element must be visible
        };

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    // Optional: stop observing once revealed (uncomment line below if you only want it to animate once)
                    // observer.unobserve(entry.target); 
                } else {
                    // Remove class when scrolling back up (allows repeatable animations)
                    entry.target.classList.remove('in-view'); 
                }
            });
        }, revealOptions);

        revealElements.forEach(el => {
            revealObserver.observe(el);
        });
    }
});
