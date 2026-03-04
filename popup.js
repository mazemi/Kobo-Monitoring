// Default BASE_URL - will be overridden by stored value
let BASE_URL = "https://kobo.impact-initiatives.org/api/v2";
const CACHE_DURATION = 20 * 60 * 1000; // 20 minutes cache for projects
const DATA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache for submission data

document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    setupEventListeners();
});

function setupEventListeners() {
    // Settings
    document.getElementById("settingsBtn").addEventListener("click", toggleSettings);
    document.getElementById("closeSettings").addEventListener("click", toggleSettings);
    document.getElementById("saveToken").addEventListener("click", saveSettings);
    document.getElementById("logoutBtn").addEventListener("click", logout);
    
    // Project selection
    document.getElementById("closeSelector").addEventListener("click", hideProjectSelector);
    document.getElementById("saveProjectSelection").addEventListener("click", saveProjectSelection);
    document.getElementById("refreshProjects").addEventListener("click", () => loadProjects(true));
    
    // Token input enter key
    document.getElementById("token").addEventListener("keypress", (e) => {
        if (e.key === "Enter") saveSettings();
    });
    
    // Base URL dropdown setup
    setupBaseUrlDropdown();
    
    // Close modals when clicking outside
    document.getElementById("settingsModal").addEventListener("click", (e) => {
        if (e.target === document.getElementById("settingsModal")) {
            toggleSettings();
        }
    });
    
    document.getElementById("projectSelector").addEventListener("click", (e) => {
        if (e.target === document.getElementById("projectSelector")) {
            hideProjectSelector();
        }
    });
}

function showSetupMessage() {
    document.getElementById("tabsContainer").innerHTML = "";
    document.getElementById("results").innerHTML = `
        <div class="empty-state">
            <h4>Welcome to KoBo Monitor</h4>
            <p>Please open <strong>Settings</strong> and configure:</p>
            <p> - KoBo Server (Base URL)</p>
            <p> - API Token</p>
            <p>After saving, you can select projects to monitor.</p>
        </div>
    `;
}

function loadSettings() {
    chrome.storage.local.get(["koboToken", "koboBaseUrl"], (result) => {
        const hasToken = result.koboToken && result.koboToken.trim() !== "";
        
        if (hasToken) {
            document.getElementById("token").value = result.koboToken;
        }

        if (result.koboBaseUrl) {
            BASE_URL = result.koboBaseUrl;
            const displayUrl = result.koboBaseUrl.replace('/api/v2', '');
            setBaseUrlInput(displayUrl);
        }

        // If no token → show setup message
        if (!hasToken) {
            showSetupMessage();
            return;
        }

        // Token exists - load projects and initialize UI
        loadProjects();
        loadSelectedProjects();
    });
}

// ==================== BASE URL DROPDOWN HANDLING ====================

function setupBaseUrlDropdown() {
    const select = document.getElementById('baseUrlSelect');
    const customInput = document.getElementById('baseUrlCustom');
    
    select.addEventListener('change', () => {
        if (select.value === 'custom') {
            customInput.classList.remove('hidden');
            customInput.focus();
        } else {
            customInput.classList.add('hidden');
            customInput.value = '';
        }
    });
}

function getBaseUrlFromInput() {
    const select = document.getElementById('baseUrlSelect');
    const customInput = document.getElementById('baseUrlCustom');
    
    if (select.value === 'custom') {
        return customInput.value.trim();
    } else {
        return select.value;
    }
}

function setBaseUrlInput(url) {
    const select = document.getElementById('baseUrlSelect');
    const customInput = document.getElementById('baseUrlCustom');
    
    // Check if URL matches any of the predefined options
    const options = Array.from(select.options).map(opt => opt.value);
    
    if (options.includes(url)) {
        select.value = url;
        customInput.classList.add('hidden');
        customInput.value = '';
    } else {
        select.value = 'custom';
        customInput.classList.remove('hidden');
        customInput.value = url;
    }
}

// ==================== SETTINGS MANAGEMENT ====================

function toggleSettings() {
    const modal = document.getElementById("settingsModal");
    modal.classList.toggle("hidden");
    
    // Refresh the dropdown values when opening
    if (!modal.classList.contains("hidden")) {
        chrome.storage.local.get(["koboBaseUrl"], (result) => {
            if (result.koboBaseUrl) {
                // Remove /api/v2 for display
                const baseUrl = result.koboBaseUrl.replace('/api/v2', '');
                setBaseUrlInput(baseUrl);
            }
        });
    }
}

function hideProjectSelector() {
    document.getElementById("projectSelector").classList.add("hidden");
}

function showProjectSelector() {
    document.getElementById("projectSelector").classList.remove("hidden");
    loadProjects(false);
}

function showSpinner(elementId) {
    document.getElementById(elementId).style.display = "inline-block";
}

function hideSpinner(elementId) {
    document.getElementById(elementId).style.display = "none";
}

function showStatus(message, isSuccess = true) {
    const statusEl = document.getElementById("tokenStatus");
    statusEl.textContent = message;
    statusEl.className = "status-message " + (isSuccess ? "success" : "error");
    
    setTimeout(() => {
        statusEl.textContent = "";
        statusEl.className = "status-message";
    }, 3000);
}

function logout() {
    chrome.storage.local.remove(["koboToken", "koboBaseUrl", "projectsCache", "selectedProjectsData", "projectDataCache"], () => {
        document.getElementById("token").value = "";
        setBaseUrlInput("https://kobo.impact-initiatives.org");
        document.getElementById("tabsContainer").innerHTML = "";
        showSetupMessage();
        BASE_URL = "https://kobo.impact-initiatives.org/api/v2";
        showStatus("Logged out successfully");
        toggleSettings();
    });
}

function saveSettings() {
    const token = document.getElementById("token").value.trim();
    let baseUrl = getBaseUrlFromInput();
    
    if (!token) {
        showStatus("Please enter a token", false);
        return;
    }
    
    if (!baseUrl) {
        showStatus("Please enter a base URL", false);
        return;
    }
    
    // Clean up base URL
    baseUrl = baseUrl.replace(/\/$/, '');
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'https://' + baseUrl;
    }
    
    // Add /api/v2 if not present
    if (!baseUrl.endsWith('/api/v2')) {
        baseUrl = baseUrl + '/api/v2';
    }
    
    chrome.storage.local.set({ 
        koboToken: token,
        koboBaseUrl: baseUrl
    }, () => {
        BASE_URL = baseUrl;
        showStatus("Settings saved successfully");
        
        // Close settings modal
        toggleSettings();
        
        // Clear any existing content
        document.getElementById("tabsContainer").innerHTML = "";
        document.getElementById("results").innerHTML = "";
        
        // Load projects and initialize UI
        loadProjects(true);
        loadSelectedProjects();
    });
}

// ==================== PROJECT SELECTION MANAGEMENT ====================

function saveProjectSelection() {
    const select = document.getElementById("projectSelect");
    const selectedOptions = Array.from(select.selectedOptions);
    
    if (selectedOptions.length === 0) {
        alert("Please select at least one project");
        return;
    }
    
    const selectedProjects = selectedOptions.map(o => ({
        uid: o.value,
        name: o.textContent.split(' (Created:')[0],
        created: o.dataset.created
    }));
    
    chrome.storage.local.get(["selectedProjectsData"], (result) => {
        const existingProjects = result.selectedProjectsData || [];
        
        // Merge existing and new projects, avoiding duplicates
        const allProjects = [...existingProjects];
        selectedProjects.forEach(newProject => {
            if (!allProjects.some(p => p.uid === newProject.uid)) {
                allProjects.push(newProject);
            }
        });
        
        chrome.storage.local.set({ selectedProjectsData: allProjects }, () => {
            hideProjectSelector();
            
            // Clear results div completely
            document.getElementById("results").innerHTML = '';
            
            // Get the last added project UID to make it active
            const lastAddedUid = selectedProjects[selectedProjects.length - 1].uid;
            
            // Update tabs with new projects and set the last added as active
            createProjectTabs(allProjects, lastAddedUid);
            
            // Load data for all projects
            loadDataForSelectedProjects();
        });
    });
}

function loadSelectedProjects() {
    chrome.storage.local.get(["selectedProjectsData"], (result) => {
        if (result.selectedProjectsData && result.selectedProjectsData.length > 0) {
            createProjectTabs(result.selectedProjectsData, result.selectedProjectsData[0].uid);
            loadDataForSelectedProjects(false);
        } else {
            // Show empty state with just the + tab
            createProjectTabs([]);
            document.getElementById("results").innerHTML = '<div class="empty-state">Click + to add projects to monitor</div>';
        }
    });
}

function removeProject(uid) {
    chrome.storage.local.get(["selectedProjectsData", "projectDataCache"], (result) => {
        const updatedProjects = result.selectedProjectsData.filter(p => p.uid !== uid);
        
        // Also remove from cache
        const updatedCache = { ...result.projectDataCache };
        delete updatedCache[uid];
        
        chrome.storage.local.set({ 
            selectedProjectsData: updatedProjects,
            projectDataCache: updatedCache
        }, () => {
            // Determine which tab to make active
            let activeUid = null;
            if (updatedProjects.length > 0) {
                activeUid = updatedProjects[0].uid;
            }
            
            // Recreate tabs with updated projects
            createProjectTabs(updatedProjects, activeUid);
            
            if (updatedProjects.length === 0) {
                document.getElementById("results").innerHTML = '<div class="empty-state">Click + to add projects to monitor</div>';
            } else {
                loadDataForSelectedProjects();
            }
        });
    });
}

// ==================== TABS MANAGEMENT ====================

function createProjectTabs(projects, activeUid = null) {
    const tabsContainer = document.getElementById("tabsContainer");
    tabsContainer.innerHTML = "";
    
    const tabsList = document.createElement("div");
    tabsList.className = "tabs-list";
    
    // Create tabs for each project
    projects.forEach((project) => {
        const tab = document.createElement("div");
        tab.className = "tab";
        if (activeUid === project.uid) {
            tab.classList.add("active");
        }
        tab.dataset.uid = project.uid;
        
        // Project name with tooltip
        const tabName = document.createElement("span");
        tabName.className = "tab-name";
        tabName.textContent = project.name;
        tabName.title = project.name;
        
        // Remove button (X)
        const removeBtn = document.createElement("button");
        removeBtn.className = "close-circle small";
        removeBtn.textContent = "\u00D7";
        removeBtn.title = "Remove project";
        removeBtn.setAttribute("aria-label", "Remove project");
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            removeProject(project.uid);
        });
        
        tab.appendChild(tabName);
        tab.appendChild(removeBtn);
        
        tab.addEventListener("click", (e) => {
            if (!e.target.classList.contains('close-circle')) {
                switchTab(project.uid);
            }
        });
        
        tabsList.appendChild(tab);
    });
    
    // Create the "+" tab for adding projects
    const addTab = document.createElement("div");
    addTab.className = "tab add-tab";
    addTab.id = "addProjectTab";
    
    const addIcon = document.createElement("span");
    addIcon.className = "add-icon";
    addIcon.textContent = "+";
    addTab.appendChild(addIcon);
    
    addTab.addEventListener("click", () => {
        showProjectSelector();
    });
    
    tabsList.appendChild(addTab);
    tabsContainer.appendChild(tabsList);
    
    // Show the active project data if available
    if (activeUid) {
        showProjectData(activeUid);
    } else if (projects.length > 0) {
        showProjectData(projects[0].uid);
    }
}

function switchTab(uid) {
    // Update active tab
    document.querySelectorAll('.tab:not(.add-tab)').forEach(tab => {
        if (tab.dataset.uid === uid) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Show corresponding project data
    showProjectData(uid);
}

function showProjectData(uid) {
    // Hide all project data sections
    document.querySelectorAll('.project-data').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected project data
    const selectedSection = document.getElementById(`project-${uid}`);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    } else {
        // If data not loaded yet, load it
        chrome.storage.local.get(["selectedProjectsData"], (result) => {
            const project = result.selectedProjectsData.find(p => p.uid === uid);
            if (project) loadDataForProject(project);
        });
    }
}

// ==================== DATA LOADING WITH CACHING ====================

async function loadDataForSelectedProjects(forceRefresh = false) {
    chrome.storage.local.get(["selectedProjectsData", "projectDataCache"], async (result) => {
        if (!result.selectedProjectsData || result.selectedProjectsData.length === 0) {
            return;
        }
        
        const resultsDiv = document.getElementById("results");
        const now = Date.now();
        
        // Check if we have any cached data at all
        let hasAnyCache = false;
        if (!forceRefresh && result.projectDataCache) {
            for (let project of result.selectedProjectsData) {
                const cached = result.projectDataCache[project.uid];
                if (cached && (now - cached.timestamp) <= DATA_CACHE_DURATION) {
                    hasAnyCache = true;
                    break;
                }
            }
        }
        
        // Only show loading spinner if we have NO cached data
        if (!hasAnyCache) {
            resultsDiv.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p class="loading-text">Loading project data...</p>
                </div>
            `;
        } else {
            // Clear results to prepare for cached data display
            resultsDiv.innerHTML = '';
        }
        
        // Display cached data if available
        if (!forceRefresh && result.projectDataCache) {
            for (let project of result.selectedProjectsData) {
                const cached = result.projectDataCache[project.uid];
                if (cached && (now - cached.timestamp) <= DATA_CACHE_DURATION) {
                    // Create the project section with cached data
                    createProjectSection(project, cached.data, true);
                }
            }
        }
        
        // If we have cached data, show it immediately and remove loading state
        if (hasAnyCache) {
            // Remove any loading container
            const loadingContainer = document.querySelector('.loading-container');
            if (loadingContainer) {
                loadingContainer.remove();
            }
            updateVisibleTab();
        }
        
        // Now fetch fresh data for all projects in parallel
        const projectsToFetch = result.selectedProjectsData.filter(project => {
            if (!forceRefresh && result.projectDataCache) {
                const cached = result.projectDataCache[project.uid];
                return !cached || (now - cached.timestamp) > DATA_CACHE_DURATION;
            }
            return true;
        });
        
        if (projectsToFetch.length > 0) {
            // Show fetching indicator (small floating one)
            showFetchingIndicator(projectsToFetch.length);
            
            // Fetch all projects in parallel
            const fetchPromises = projectsToFetch.map(project => 
                fetchProjectData(project, forceRefresh)
            );
            
            // Wait for all fetches to complete
            await Promise.allSettled(fetchPromises);
            
            // Remove fetching indicator
            removeFetchingIndicator();
            
            // Remove any remaining loading container (just in case)
            const loadingContainer = document.querySelector('.loading-container');
            if (loadingContainer) {
                loadingContainer.remove();
            }
            
            // Update visible tab data
            updateVisibleTab();
        } else {
            // If no projects to fetch, make sure loading container is removed
            const loadingContainer = document.querySelector('.loading-container');
            if (loadingContainer) {
                loadingContainer.remove();
            }
        }
    });
}

async function loadDataForProject(project, forceRefresh = false) {
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
        const cached = await getCachedProjectData(project.uid);
        if (cached) {
            createProjectSection(project, cached, true);
            updateVisibleTab();
            return;
        }
    }
    
    try {
        const data = await apiFetch(`/assets/${project.uid}/data/?format=json&page_size=100000`);
        await cacheProjectData(project.uid, data);
        createProjectSection(project, data, false);
        updateVisibleTab();
    } catch (error) {
        console.error("Error loading project data:", error);
        displayProjectError(project);
    }
}

async function fetchProjectData(project, forceRefresh) {
    try {
        const data = await apiFetch(`/assets/${project.uid}/data/?format=json&page_size=100000`);
        await cacheProjectData(project.uid, data);
        
        // Update the UI for this project
        createProjectSection(project, data, false);
        
        // Check if this was the last project to load and remove loading container
        chrome.storage.local.get(["selectedProjectsData", "projectDataCache"], (result) => {
            const now = Date.now();
            const allLoaded = result.selectedProjectsData.every(p => {
                const cached = result.projectDataCache?.[p.uid];
                return cached && (now - cached.timestamp) <= DATA_CACHE_DURATION;
            });
            
            if (allLoaded) {
                const loadingContainer = document.querySelector('.loading-container');
                if (loadingContainer) {
                    loadingContainer.remove();
                }
            }
        });
        
    } catch (error) {
        console.error(`Error loading project ${project.uid}:`, error);
        displayProjectError(project);
    }
}

async function refreshProject(uid, event) {
    event.stopPropagation();
    
    chrome.storage.local.get(["selectedProjectsData"], async (result) => {
        const project = result.selectedProjectsData.find(p => p.uid === uid);
        if (!project) return;
        
        const refreshBtn = event.target;
        const originalText = refreshBtn.textContent;
        refreshBtn.textContent = "Loading...";
        refreshBtn.disabled = true;
        
        try {
            const data = await apiFetch(`/assets/${project.uid}/data/?format=json&page_size=100000`);
            await cacheProjectData(project.uid, data);
            createProjectSection(project, data, false);
        } catch (error) {
            console.error("Error refreshing project data:", error);
            refreshBtn.textContent = "Error";
            refreshBtn.style.color = "#f44336";
            setTimeout(() => {
                refreshBtn.textContent = originalText;
                refreshBtn.style.color = "";
            }, 2000);
        } finally {
            setTimeout(() => {
                refreshBtn.textContent = originalText;
                refreshBtn.disabled = false;
            }, 1000);
        }
    });
}

// ==================== UI RENDERING ====================

function createProjectSection(project, data, fromCache = false) {
    const resultsDiv = document.getElementById("results");
    const submissions = data.results || data;
    
    // Remove loading container if it exists (when first project loads)
    const loadingContainer = document.querySelector('.loading-container');
    if (loadingContainer) {
        loadingContainer.remove();
    }
    
    let projectSection = document.getElementById(`project-${project.uid}`);
    
    if (!projectSection) {
        projectSection = document.createElement("div");
        projectSection.id = `project-${project.uid}`;
        projectSection.className = "project-data";
        projectSection.style.display = 'none';
        resultsDiv.appendChild(projectSection);
    }
    
    if (submissions.length === 0) {
        projectSection.innerHTML = `
            <div class="project-section">
                <div class="project-header">
                    <h4>${escapeHtml(project.name)} <span class="project-total">Total: 0</span></h4>
                    <button class="refresh-project-btn" title="Refresh data" data-uid="${project.uid}">Refresh</button>
                </div>
                <p class="no-data">No submissions found for this project</p>
            </div>`;
    } else {
        // Sort submissions by date (newest first)
        const sortedSubmissions = [...submissions].sort((a, b) => 
            new Date(b._submission_time) - new Date(a._submission_time)
        );
        
        // Get the most recent submission date
        const latestSubmissionDate = new Date(sortedSubmissions[0]._submission_time);
        const sevenDaysBeforeLatest = new Date(latestSubmissionDate);
        sevenDaysBeforeLatest.setDate(latestSubmissionDate.getDate() - 7);
        
        // Count submissions before the 7-day window
        const olderSubmissions = submissions.filter(sub => {
            const d = new Date(sub._submission_time);
            return d < sevenDaysBeforeLatest;
        });
        
        // Submissions in the last 7 days from latest submission
        const recentSubmissions = submissions.filter(sub => {
            const d = new Date(sub._submission_time);
            return d >= sevenDaysBeforeLatest && d <= latestSubmissionDate;
        });
        
        const totalSubmissions = submissions.length;
        
        // Group recent submissions by date
        const grouped = {};
        recentSubmissions.forEach(sub => {
            const date = sub._submission_time.split("T")[0];
            grouped[date] = (grouped[date] || 0) + 1;
        });
        
        let html = `<div class="project-section">
            <div class="project-header">
                <h4>${escapeHtml(project.name)} <span class="project-total">Total: ${totalSubmissions}</span></h4>
                <button class="refresh-project-btn" title="Refresh data" data-uid="${project.uid}">Refresh</button>
            </div>`;
        
        if (fromCache) {
            html += `<p class="cache-indicator">Cached data</p>`;
        }
        
        if (recentSubmissions.length === 0) {
            html += `<p class="no-data">No submissions in the last 7 days</p>`;
        } else {
            html += `<table>
                <tr>
                    <th>Date</th>
                    <th>New</th>
                    <th>Total</th>
                </tr>`;
            
            // Get all dates in the 7-day window and sort ascending
            const dates = Object.keys(grouped).sort();
            
            // Calculate running total
            let runningTotal = olderSubmissions.length;
            
            dates.forEach(date => {
                runningTotal += grouped[date];
                const dateObj = new Date(date);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                
                html += `
                    <tr>
                        <td>${date} (${dayName})</td>
                        <td>${grouped[date]}</td>
                        <td>${runningTotal}</td>
                    </tr>`;
            });
            
            html += "</table>";
        }
        
        html += "</div>";
        projectSection.innerHTML = html;
    }
    
    // Add refresh button event listener
    const refreshBtn = projectSection.querySelector('.refresh-project-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => refreshProject(project.uid, e));
    }
}

function displayProjectError(project) {
    const resultsDiv = document.getElementById("results");
    let projectSection = document.getElementById(`project-${project.uid}`);
    
    if (!projectSection) {
        projectSection = document.createElement("div");
        projectSection.id = `project-${project.uid}`;
        projectSection.className = "project-data";
        projectSection.style.display = 'none';
        resultsDiv.appendChild(projectSection);
    }
    
    projectSection.innerHTML = `
        <div class="project-section">
            <div class="project-header">
                <h4>${escapeHtml(project.name)} <span class="project-total">Error</span></h4>
                <button class="refresh-project-btn" title="Retry" data-uid="${project.uid}">Retry</button>
            </div>
            <p class="error">Error loading data for this project</p>
        </div>`;
    
    const refreshBtn = projectSection.querySelector('.refresh-project-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => refreshProject(project.uid, e));
    }
    
    const activeTab = document.querySelector('.tab.active');
    if (activeTab && activeTab.dataset.uid === project.uid) {
        projectSection.style.display = 'block';
    }
}

function showFetchingIndicator(projectCount) {
    removeFetchingIndicator();
    
    const indicator = document.createElement('div');
    indicator.id = 'fetching-indicator';
    indicator.className = 'fetching-indicator';
    indicator.innerHTML = `
        <div class="loading-spinner small"></div>
        <span>Fetching data for ${projectCount} project${projectCount > 1 ? 's' : ''}...</span>
    `;
    
    document.getElementById('mainContent').appendChild(indicator);
}

function removeFetchingIndicator() {
    const existing = document.getElementById('fetching-indicator');
    if (existing) {
        existing.remove();
    }
}

function updateVisibleTab() {
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
        document.querySelectorAll('.project-data').forEach(section => {
            if (section.id === `project-${activeTab.dataset.uid}`) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== CACHE MANAGEMENT ====================

async function cacheProjectData(projectUid, data) {
    return new Promise((resolve) => {
        chrome.storage.local.get(["projectDataCache"], (result) => {
            const cache = result.projectDataCache || {};
            cache[projectUid] = {
                timestamp: Date.now(),
                data: data
            };
            chrome.storage.local.set({ projectDataCache: cache }, resolve);
        });
    });
}

async function getCachedProjectData(projectUid) {
    return new Promise((resolve) => {
        chrome.storage.local.get(["projectDataCache"], (result) => {
            if (result.projectDataCache && result.projectDataCache[projectUid]) {
                const cached = result.projectDataCache[projectUid];
                const now = Date.now();
                
                if (now - cached.timestamp < DATA_CACHE_DURATION) {
                    resolve(cached.data);
                } else {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });
    });
}

// ==================== API CALLS ====================

async function apiFetch(endpoint) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["koboToken", "koboBaseUrl"], async (result) => {
            if (!result.koboToken) {
                reject(new Error("No token found"));
                return;
            }
            
            const baseUrl = result.koboBaseUrl || "https://kobo.impact-initiatives.org/api/v2";
            
            try {
                const response = await fetch(`${baseUrl}${endpoint}`, {
                    headers: {
                        "Authorization": `Token ${result.koboToken}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                resolve(data);
            } catch (error) {
                reject(error);
            }
        });
    });
}

async function loadProjects(forceRefresh = false) {
    const select = document.getElementById("projectSelect");
    
    if (!forceRefresh) {
        const cached = await getCachedProjects();
        if (cached) {
            displayProjectList(cached);
            return;
        }
    }
    
    select.innerHTML = "";
    showSpinner("projectSpinner");
    
    try {
        const data = await apiFetch("/assets/");
        
        if (!data.results || data.results.length === 0) {
            select.innerHTML = '<option disabled>No projects found</option>';
            return;
        }

        cacheProjects(data.results);
        displayProjectList(data.results);
        
    } catch (error) {
        console.error("Error loading projects:", error);
        select.innerHTML = '<option disabled>Error loading projects. Check token and URL.</option>';
    } finally {
        hideSpinner("projectSpinner");
    }
}

function displayProjectList(projects) {
    const select = document.getElementById("projectSelect");
    select.innerHTML = "";
    
    chrome.storage.local.get(["selectedProjectsData"], (result) => {
        const selectedUids = (result.selectedProjectsData || []).map(p => p.uid);
        
        // Filter projects without valid names
        const filteredProjects = projects.filter(project => 
            project.name && project.name.trim() !== ""
        );
        
        if (filteredProjects.length === 0) {
            select.innerHTML = '<option disabled>No valid projects found</option>';
            return;
        }
        
        filteredProjects.forEach(project => {
            const option = document.createElement("option");
            option.value = project.uid;
            option.textContent = `${project.name} (Created: ${new Date(project.date_created).toLocaleDateString()})`;
            option.dataset.created = project.date_created;
            
            if (selectedUids.includes(project.uid)) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
    });
}

function cacheProjects(projects) {
    const cacheData = {
        timestamp: Date.now(),
        projects: projects
    };
    chrome.storage.local.set({ projectsCache: cacheData });
}

async function getCachedProjects() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["projectsCache"], (result) => {
            if (result.projectsCache) {
                const cache = result.projectsCache;
                const now = Date.now();
                
                if (now - cache.timestamp < CACHE_DURATION) {
                    resolve(cache.projects);
                } else {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });
    });
}