// Variables :
const serviceTabs = document.querySelector(".services__tabs");
const travelSlide = document.querySelector(".travell__slides");

// DOM :

document.addEventListener("DOMContentLoaded", () => {
  // Navbar Section :
  hamburgerMenu();

  // Services Section :
  selectServiceTabs();
  createClickDragScroll(serviceTabs);

  // Travel Section :
  createClickDragScroll(travelSlide);

  // Accordion Section :
  showAccordion();
});

// Functions :

function hamburgerMenu() {
  const toggler = document.querySelector(".nav__toggler");
  const navbar = document.querySelector(".nav");
  toggler.addEventListener("click", (e) => {
    navbar.classList.toggle("nav__expanded");
  });
}

function createClickDragScroll(slider) {
  let isDown = false;
  let startX;
  let scrollLeft;

  slider.addEventListener("mousedown", (e) => {
    isDown = true;
    slider.classList.add("active-scroll");
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
  });
  slider.addEventListener("mouseleave", () => {
    isDown = false;
    slider.classList.remove("active-scroll");
  });
  slider.addEventListener("mouseup", () => {
    isDown = false;
    slider.classList.remove("active-scroll");
  });
  slider.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 3; //scroll-fast
    slider.scrollLeft = scrollLeft - walk;
  });
}

function selectServiceTabs() {
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");
  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      const targeTabContent = document.querySelector(
        `#${tab.dataset.tabTarget}`
      );

      // REMOVE PREVIOUS ACTIVED CLASSES
      tabs.forEach((tab) => tab.classList.remove("active"));
      tabContents.forEach((tabContent) =>
        tabContent.classList.remove("active")
      );

      // ADD NEW ACTIVE CLASSES
      tab.classList.add("active");
      targeTabContent.classList.add("active");
    });
  });
}

function showAccordion() {
  const accordionHeaders = document.querySelectorAll(".accordion__header");
  const icon = document.querySelectorAll("div.icon");

  accordionHeaders.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.target.parentElement.classList.toggle("accordion__expanded");
    });
  });

  icon.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.target.parentElement.parentElement.parentElement.classList.toggle(
        "accordion__expanded"
      );
    });
  });
}
