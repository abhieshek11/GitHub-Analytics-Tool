// Set Chart.js global defaults for white text
if (typeof Chart !== "undefined") {
  Chart.defaults.color = "#ffffff";
  Chart.defaults.plugins.legend.labels.color = "#ffffff";
  Chart.defaults.plugins.tooltip.titleColor = "#ffffff";
  Chart.defaults.plugins.tooltip.bodyColor = "#ffffff";
  Chart.defaults.scale.ticks.color = "#ffffff";
}

class GitHubAnalytics {
  constructor() {
    this.apiBase = "https://api.github.com";
    this.currentUser = null;
    this.charts = {};
    this.languageColors = {
      JavaScript: "#f1e05a",
      Python: "#3572a5",
      Java: "#b07219",
      TypeScript: "#2b7489",
      HTML: "#e34c26",
      CSS: "#563d7c",
      PHP: "#4f5d95",
      C: "#555555",
      "C++": "#f34b7d",
      Go: "#00add8",
      Rust: "#dea584",
      Swift: "#ffac45",
      Kotlin: "#f18e33",
      Dart: "#00b4ab",
      Ruby: "#701516",
      Shell: "#89e051",
    };

    // Array of example usernames for suggestions
    this.rotatingUsernames = [
      "octocat",
      "torvalds",
      "gaearon",
      "sindresorhus",
      "tj",
      "addyosmani",
      "paulirish",
      "mikeal",
      "substack",
      "isaacs",
      "mrdoob",
      "jeresig",
      "defunkt",
      "mojombo",
      "wycats",
      "dhh",
      "tenderlove",
      "jashkenas",
      "fat",
      "mbostock",
      "holman",
      "kneath",
      "rtomayko",
      "technoweenie",
      "schacon",
      "pjhyett",
      "caged",
      "atmos",
      "bmizerany",
      "qrush",
    ];

    this.currentRotationIndex = 0;

    this.initializeEventListeners();
    this.startSuggestionRotation();
  }

  initializeEventListeners() {
    const searchBtn = document.getElementById("searchBtn");
    const usernameInput = document.getElementById("usernameInput");

    searchBtn.addEventListener("click", () => this.searchUser());

    usernameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.searchUser();
      }
    });

    // Add some example usernames for demonstration
    usernameInput.addEventListener("focus", () => {
      if (!usernameInput.value) {
        usernameInput.placeholder =
          "Try: octocat, torvalds, gaearon, sindresorhus...";
      }
    });

    usernameInput.addEventListener("blur", () => {
      usernameInput.placeholder = "Enter GitHub username...";
    });
  }

  async searchUser() {
    const username = document.getElementById("usernameInput").value.trim();

    if (!username) {
      this.showError("Please enter a GitHub username");
      return;
    }

    this.showLoading();
    this.hideError();
    this.hideUserProfile();

    try {
      const userData = await this.fetchUserData(username);
      const reposData = await this.fetchUserRepos(username);

      this.currentUser = userData;
      this.displayUserProfile(userData, reposData);
      this.createCharts(reposData);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.hideLoading();
    }
  }

  async fetchUserData(username) {
    const response = await fetch(`${this.apiBase}/users/${username}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          "User not found. Please check the username and try again."
        );
      } else if (response.status === 403) {
        throw new Error("API rate limit exceeded. Please try again later.");
      } else {
        throw new Error("Failed to fetch user data. Please try again.");
      }
    }

    return await response.json();
  }

  async fetchUserRepos(username) {
    const response = await fetch(
      `${this.apiBase}/users/${username}/repos?sort=stars&per_page=100`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch repositories data");
    }

    return await response.json();
  }

  displayUserProfile(userData, reposData) {
    // Calculate total stars
    const totalStars = reposData.reduce(
      (sum, repo) => sum + repo.stargazers_count,
      0
    );

    // Update profile information
    document.getElementById("userAvatar").src = userData.avatar_url;
    document.getElementById("userName").textContent =
      userData.name || userData.login;
    document.getElementById("userBio").textContent =
      userData.bio || "No bio available";

    // Update stats with animation
    this.animateCounter("publicRepos", userData.public_repos);
    this.animateCounter("followers", userData.followers);
    this.animateCounter("following", userData.following);
    this.animateCounter("totalStars", totalStars);

    // Display repositories
    this.displayRepositories(reposData.slice(0, 12)); // Show top 12 repos

    this.showUserProfile();
  }

  displayRepositories(repos) {
    const container = document.getElementById("repositoriesList");
    container.innerHTML = "";

    repos.forEach((repo, index) => {
      const repoElement = document.createElement("div");
      repoElement.className = "repo-item fade-in";
      repoElement.style.animationDelay = `${index * 0.1}s`;

      const languageColor = this.languageColors[repo.language] || "#ccc";

      repoElement.innerHTML = `
                <div class="repo-name">${repo.name}</div>
                <div class="repo-description">${
                  repo.description || "No description available"
                }</div>
                <div class="repo-stats">
                    ${
                      repo.language
                        ? `
                        <div class="repo-stat">
                            <span class="language-dot" style="background-color: ${languageColor}"></span>
                            ${repo.language}
                        </div>
                    `
                        : ""
                    }
                    <div class="repo-stat">
                        <i class="fas fa-star text-warning"></i>
                        ${repo.stargazers_count}
                    </div>
                    <div class="repo-stat">
                        <i class="fas fa-code-branch text-info"></i>
                        ${repo.forks_count}
                    </div>
                    <div class="repo-stat">
                        <i class="fas fa-eye text-secondary"></i>
                        ${repo.watchers_count}
                    </div>
                </div>
            `;

      repoElement.addEventListener("click", () => {
        window.open(repo.html_url, "_blank");
      });

      container.appendChild(repoElement);
    });
  }

  createCharts(reposData) {
    this.createLanguageChart(reposData);
    this.createStarsChart(reposData);
  }

  createLanguageChart(reposData) {
    const languageStats = {};

    reposData.forEach((repo) => {
      if (repo.language) {
        languageStats[repo.language] = (languageStats[repo.language] || 0) + 1;
      }
    });

    const sortedLanguages = Object.entries(languageStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8); // Top 8 languages

    const labels = sortedLanguages.map(([lang]) => lang);
    const data = sortedLanguages.map(([, count]) => count);
    const colors = labels.map((lang) => this.languageColors[lang] || "#ccc");

    if (this.charts.language) {
      this.charts.language.destroy();
    }

    const ctx = document.getElementById("languageChart").getContext("2d");
    this.charts.language = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors,
            borderColor: "#1a1a2e",
            borderWidth: 4,
            hoverOffset: 12,
            hoverBorderWidth: 6,
            hoverBorderColor: "#00d4ff",
            hoverBackgroundColor: colors.map((color) =>
              this.adjustBrightness(color, 20)
            ),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: window.innerWidth < 768 ? 10 : 20,
              usePointStyle: true,
              pointStyle: "circle",
              font: {
                size:
                  window.innerWidth < 480
                    ? 11
                    : window.innerWidth < 768
                    ? 12
                    : 13,
                family: "Space Grotesk",
                weight: "500",
              },
              color: "#ffffff",
              boxWidth: window.innerWidth < 480 ? 12 : 15,
              boxHeight: window.innerWidth < 480 ? 12 : 15,
              generateLabels: function (chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const dataset = data.datasets[0];
                    const value = dataset.data[i];
                    const total = dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);

                    return {
                      text: `${label} (${percentage}%)`,
                      fillStyle: dataset.backgroundColor[i],
                      fontColor: "#ffffff",
                      color: "#ffffff",
                      hidden: false,
                      index: i,
                    };
                  });
                }
                return [];
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            borderColor: "#00d4ff",
            borderWidth: 2,
            cornerRadius: 10,
            displayColors: true,
            titleFont: {
              size: 14,
              weight: "bold",
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} repos (${percentage}%)`;
              },
            },
          },
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1200,
          easing: "easeOutCubic",
        },
        interaction: {
          intersect: false,
          mode: "nearest",
        },
        onHover: (event, activeElements, chart) => {
          const canvas = chart.canvas;
          canvas.style.cursor =
            activeElements.length > 0 ? "pointer" : "default";
        },
      },
    });
  }

  // Helper function to adjust color brightness
  adjustBrightness(color, amount) {
    const usePound = color[0] === "#";
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00ff) + amount;
    let b = (num & 0x0000ff) + amount;
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    return (
      (usePound ? "#" : "") +
      ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")
    );
  }

  createStarsChart(reposData) {
    const topRepos = reposData
      .filter((repo) => repo.stargazers_count > 0)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 10);

    const labels = topRepos.map((repo) =>
      repo.name.length > 15 ? repo.name.substring(0, 15) + "..." : repo.name
    );
    const data = topRepos.map((repo) => repo.stargazers_count);

    if (this.charts.stars) {
      this.charts.stars.destroy();
    }

    const ctx = document.getElementById("starsChart").getContext("2d");
    this.charts.stars = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Stars",
            data: data,
            backgroundColor: "rgba(102, 126, 234, 0.8)",
            borderColor: "rgba(102, 126, 234, 1)",
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
            ticks: {
              font: {
                family: "Inter",
              },
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: {
                family: "Inter",
              },
            },
          },
        },
        animation: {
          duration: 1000,
          easing: "easeOutQuart",
        },
      },
    });
  }

  animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const startValue = 0;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(
        startValue + (targetValue - startValue) * easeOutQuart
      );

      element.textContent = currentValue.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  showLoading() {
    document.getElementById("loadingSpinner").classList.remove("hidden");
  }

  hideLoading() {
    document.getElementById("loadingSpinner").classList.add("hidden");
  }

  showError(message) {
    document.getElementById("errorText").textContent = message;
    document.getElementById("errorMessage").classList.remove("hidden");
  }

  hideError() {
    document.getElementById("errorMessage").classList.add("hidden");
  }

  showUserProfile() {
    document.getElementById("userProfile").classList.remove("hidden");
    // Add profile link
    const profileLink = document.getElementById("profileLink");
    if (this.currentUser) {
      profileLink.href = this.currentUser.html_url;
    }
  }

  hideUserProfile() {
    document.getElementById("userProfile").classList.add("hidden");
  }

  // Helper function to adjust color brightness
  adjustBrightness(color, amount) {
    const usePound = color[0] === "#";
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00ff) + amount;
    let b = (num & 0x0000ff) + amount;
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    return (
      (usePound ? "#" : "") +
      ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")
    );
  }
}

// This will be handled by the combined DOMContentLoaded listener below

// Add some interactive effects
document.addEventListener("mousemove", (e) => {
  const cards = document.querySelectorAll(
    ".profile-card, .chart-card, .repos-card"
  );

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    } else {
      card.style.transform =
        "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
    }
  });
});

// Initialize GitHub Analytics when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new GitHubAnalytics();
});
