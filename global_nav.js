// global_nav.js
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navDropdown = document.getElementById('nav-dropdown');

    if (hamburgerBtn && navDropdown) {
        hamburgerBtn.addEventListener('click', function(event) {
            event.stopPropagation(); // Prevents click from immediately closing if we add outside click later
            const isVisible = navDropdown.style.display === 'block';
            navDropdown.style.display = isVisible ? 'none' : 'block';
        });

        // Optional: Close dropdown if clicking outside of it
        // This part remains commented out for now.
        // document.addEventListener('click', function(event) {
        //     if (navDropdown.style.display === 'block' && !navDropdown.contains(event.target) && event.target !== hamburgerBtn) {
        //         navDropdown.style.display = 'none';
        //     }
        // });
    } else {
        // Optional: console.log or console.warn if elements are not found,
        // though this script will be on pages that should have them.
        // console.warn('Global Nav: Hamburger button or dropdown not found.');
    }
});
