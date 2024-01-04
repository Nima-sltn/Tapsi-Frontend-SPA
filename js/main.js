const toggler = document.querySelector(".nav__toggler");
const navbar = document.querySelector(".nav");
toggler.addEventListener("click", (e) => {
  navbar.classList.toggle("nav__expanded");
});

const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");
tabs.forEach((tab) => {
  tab.addEventListener("click", (e) => {
    const targetTabContnt = document.querySelector(`#${tab.dataset.tabTarget}`);

    //REMOVE PREVIOUS ACTIVED CLASS
    tabs.forEach((tab) => tab.classList.remove("active"));
    tabContents.forEach((tabContent) => tabContent.classList.remove("active"));

    //ADD NEW ACTIVE CLASS
    tab.classList.add("active");
    targetTabContnt.classList.add("active");
  });
});
