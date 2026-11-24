
import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

// ======================================================
// LOCAL STORAGE HELPERS
// ======================================================

// Safely read saved information from Local Storage.
function readStorage(key, defaultValue) {
  try {
    const savedValue = localStorage.getItem(key);

    return savedValue !== null
      ? JSON.parse(savedValue)
      : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Safely save information to Local Storage.
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Unable to save ${key} to Local Storage.`, error);
  }
}

// Format a date without introducing timezone-related date shifts.
function formatDate(dateValue) {
  if (!dateValue) return "No due date";

  const [year, month, day] = dateValue.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Return today's date in local YYYY-MM-DD format.
function getTodayString() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Standardise priority values, including older saved tasks.
function getPriority(priority) {
  const value = String(priority || "medium").toLowerCase();

  return ["high", "medium", "low"].includes(value)
    ? value
    : "medium";
}

// ======================================================
// MAIN APPLICATION
// ======================================================

function App() {
  // ====================================================
  // MAIN APPLICATION STATE
  // ====================================================

  const [tasks, setTasks] = useState(() => {
    const savedTasks = readStorage("taskorbit-tasks", []);

    return Array.isArray(savedTasks) ? savedTasks : [];
  });

  const [projects, setProjects] = useState(() => {
    const savedProjects = readStorage("taskorbit-projects", [
      { id: "default", name: "Personal", color: "#7965e8" },
    ]);

    return Array.isArray(savedProjects) && savedProjects.length > 0
      ? savedProjects
      : [{ id: "default", name: "Personal", color: "#7965e8" }];
  });

  const [displayName, setDisplayName] = useState(() =>
    readStorage("taskorbit-name", "Your Name")
  );

  const [activeView, setActiveView] = useState("dashboard");
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ====================================================
  // TASK FORM STATE
  // ====================================================

  const [taskInput, setTaskInput] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskProject, setTaskProject] = useState("default");
  const [taskDueDate, setTaskDueDate] = useState("");

  // State used when editing an existing task.
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingPriority, setEditingPriority] = useState("medium");
  const [editingProject, setEditingProject] = useState("default");
  const [editingDueDate, setEditingDueDate] = useState("");

  // ====================================================
  // PROJECT STATE
  // ====================================================

  const [projectInput, setProjectInput] = useState("");

  // ====================================================
  // SETTINGS STATE
  // ====================================================

  const [notificationsEnabled, setNotificationsEnabled] = useState(() =>
    readStorage("taskorbit-notifications", true)
  );

  // ====================================================
  // NOTIFICATION STATE
  // ====================================================

  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState([]);

  // This reference identifies the entire notification area.
  // It includes both the bell button and the dropdown.
  const notificationRef = useRef(null);

  // ====================================================
  // CALENDAR STATE
  // ====================================================

  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  // ====================================================
  // SAVE DATA AUTOMATICALLY
  // ====================================================

  useEffect(() => {
    writeStorage("taskorbit-tasks", tasks);
  }, [tasks]);

  useEffect(() => {
    writeStorage("taskorbit-projects", projects);
  }, [projects]);

  useEffect(() => {
    writeStorage("taskorbit-name", displayName);
  }, [displayName]);

  useEffect(() => {
    writeStorage("taskorbit-notifications", notificationsEnabled);
  }, [notificationsEnabled]);

  // ====================================================
  // NORMAL NOTIFICATION POPOVER BEHAVIOUR
  // ====================================================

  useEffect(() => {
    // Close the dropdown when the user clicks outside
    // the notification wrapper anywhere on the screen.
    function handleClickOutside(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    }

    // pointerdown supports mouse, touch and pen interactions.
    document.addEventListener("pointerdown", handleClickOutside);

    // Remove the event listener when the component is unmounted.
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, []);

  // ====================================================
  // TASK FUNCTIONS
  // ====================================================

  // Add a new task.
  function addTask(event) {
    event.preventDefault();

    const cleanTitle = taskInput.trim();

    if (!cleanTitle) return;

    const newTask = {
      id: Date.now(),
      title: cleanTitle,
      completed: false,
      priority: getPriority(taskPriority),
      projectId: taskProject,
      dueDate: taskDueDate,
      createdAt: new Date().toISOString(),
    };

    setTasks((previousTasks) => [...previousTasks, newTask]);

    // Reset the task form.
    setTaskInput("");
    setTaskPriority("medium");
    setTaskProject("default");
    setTaskDueDate("");
  }

  // Toggle a task between pending and completed.
  function toggleComplete(taskId) {
    setTasks((previousTasks) =>
      previousTasks.map((task) =>
        task.id === taskId
          ? { ...task, completed: !task.completed }
          : task
      )
    );
  }

  // Delete a task.
  function deleteTask(taskId) {
    setTasks((previousTasks) =>
      previousTasks.filter((task) => task.id !== taskId)
    );

    // Close the editing form if the edited task is deleted.
    if (editingTaskId === taskId) {
      cancelEditing();
    }
  }

  // Load an existing task into the editing form.
  function editTask(task) {
    setEditingTaskId(task.id);
    setEditingTitle(task.title || "");
    setEditingPriority(getPriority(task.priority));
    setEditingProject(task.projectId || "default");
    setEditingDueDate(task.dueDate || "");
  }

  // Save changes to an existing task.
  function saveEditedTask(event) {
    event.preventDefault();

    const cleanTitle = editingTitle.trim();

    if (!cleanTitle) return;

    setTasks((previousTasks) =>
      previousTasks.map((task) =>
        task.id === editingTaskId
          ? {
              ...task,
              title: cleanTitle,
              priority: getPriority(editingPriority),
              projectId: editingProject,
              dueDate: editingDueDate,
            }
          : task
      )
    );

    cancelEditing();
  }

  // Reset the editing form.
  function cancelEditing() {
    setEditingTaskId(null);
    setEditingTitle("");
    setEditingPriority("medium");
    setEditingProject("default");
    setEditingDueDate("");
  }

  // ====================================================
  // PROJECT FUNCTIONS
  // ====================================================

  // Create a new project.
  function addProject(event) {
    event.preventDefault();

    const cleanName = projectInput.trim();

    if (!cleanName) return;

    // Prevent duplicate project names.
    const alreadyExists = projects.some(
      (project) =>
        project.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (alreadyExists) return;

    const newProject = {
      id: `project-${Date.now()}`,
      name: cleanName,
      color: "#7965e8",
    };

    setProjects((previousProjects) => [
      ...previousProjects,
      newProject,
    ]);

    setProjectInput("");
  }

  // Find a project name using its ID.
  function getProjectName(projectId) {
    const project = projects.find(
      (item) => item.id === projectId
    );

    return project ? project.name : "Personal";
  }

  // ====================================================
  // DASHBOARD CALCULATIONS
  // ====================================================

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const pendingTasks = totalTasks - completedTasks;

  const completionPercentage =
    totalTasks === 0
      ? 0
      : Math.round((completedTasks / totalTasks) * 100);

  // Count pending tasks by priority.
  const highPriorityTasks = tasks.filter(
    (task) =>
      getPriority(task.priority) === "high" &&
      !task.completed
  ).length;

  const mediumPriorityTasks = tasks.filter(
    (task) =>
      getPriority(task.priority) === "medium" &&
      !task.completed
  ).length;

  const lowPriorityTasks = tasks.filter(
    (task) =>
      getPriority(task.priority) === "low" &&
      !task.completed
  ).length;

  // ====================================================
  // SEARCH AND FILTER TASKS
  // ====================================================

  const filteredTasks = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch = String(task.title || "")
        .toLowerCase()
        .includes(cleanSearch);

      const matchesFilter =
        filter === "all" ||
        (filter === "pending" && !task.completed) ||
        (filter === "completed" && task.completed);

      return matchesSearch && matchesFilter;
    });
  }, [tasks, filter, searchTerm]);

  // ====================================================
  // NOTIFICATION GENERATION
  // ====================================================

  const notifications = useMemo(() => {
    if (!notificationsEnabled) return [];

    const items = [];
    const todayString = getTodayString();

    // Create a notification for each pending high-priority task.
    tasks
      .filter(
        (task) =>
          getPriority(task.priority) === "high" &&
          !task.completed
      )
      .forEach((task) => {
        items.push({
          id: `high-${task.id}`,
          taskId: task.id,
          message: `High priority: ${task.title}`,
          detail: "This task is still pending.",
        });
      });

    // Create a notification for each pending task due today or overdue.
    tasks
      .filter(
        (task) =>
          task.dueDate &&
          task.dueDate <= todayString &&
          !task.completed
      )
      .forEach((task) => {
        items.push({
          id: `due-${task.id}`,
          taskId: task.id,
          message: `Task due: ${task.title}`,
          detail:
            task.dueDate < todayString
              ? `Overdue since ${formatDate(task.dueDate)}.`
              : "This task is due today.",
        });
      });

    return items;
  }, [tasks, notificationsEnabled]);

  // Calculate how many notifications have not been read.
  const unreadCount = notifications.filter(
    (item) => !readNotificationIds.includes(item.id)
  ).length;

  // Mark all currently displayed notifications as read.
  function markNotificationsRead() {
    setReadNotificationIds((previousIds) => [
      ...new Set([
        ...previousIds,
        ...notifications.map((item) => item.id),
      ]),
    ]);
  }

  // Open the task associated with a notification.
  function openNotification(item) {
    const selectedTask = tasks.find(
      (task) => task.id === item.taskId
    );

    if (!selectedTask) return;

    // Navigate directly to My Tasks.
    // Do not use changeView here because it resets the search.
    setActiveView("tasks");
    setFilter("all");
    setSearchTerm(selectedTask.title);

    // Close the notification dropdown.
    setShowNotifications(false);

    // Mark only the selected notification as read.
    setReadNotificationIds((previousIds) =>
      previousIds.includes(item.id)
        ? previousIds
        : [...previousIds, item.id]
    );
  }

  // ====================================================
  // NAVIGATION
  // ====================================================

  function changeView(view) {
    setActiveView(view);
    setSearchTerm("");

    if (view === "completed") {
      setFilter("completed");
    } else if (view === "tasks" || view === "dashboard") {
      setFilter("all");
    }

    // Close notifications when changing pages.
    setShowNotifications(false);
  }

  const navigationItems = [
    { id: "dashboard", icon: "⌂", label: "Overview" },
    { id: "tasks", icon: "▤", label: "My Tasks" },
    { id: "projects", icon: "▦", label: "Projects" },
    { id: "calendar", icon: "▣", label: "Calendar" },
    { id: "completed", icon: "✓", label: "Completed" },
    { id: "analytics", icon: "▥", label: "Analytics" },
    { id: "settings", icon: "⚙", label: "Settings" },
  ];

  // ====================================================
  // CALENDAR HELPERS
  // ====================================================

  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();

  const firstDayOfMonth = new Date(
    calendarYear,
    calendarMonthIndex,
    1
  ).getDay();

  const daysInMonth = new Date(
    calendarYear,
    calendarMonthIndex + 1,
    0
  ).getDate();

  const calendarDays = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => index + 1
    ),
  ];

  // Convert a calendar day into YYYY-MM-DD format.
  function getDateString(day) {
    const month = String(calendarMonthIndex + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");

    return `${calendarYear}-${month}-${date}`;
  }

  // Move between calendar months.
  function changeCalendarMonth(amount) {
    setCalendarMonth(
      new Date(calendarYear, calendarMonthIndex + amount, 1)
    );
  }

  // ====================================================
  // REUSABLE TASK LIST
  // ====================================================

  function renderTaskList(taskList) {
    if (taskList.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">✦</div>
          <h3>No tasks found</h3>
          <p>Add a task or change your search and filter.</p>
        </div>
      );
    }

    return (
      <div className="task-list">
        {taskList.map((task) => (
          <div className="task-card" key={task.id}>
            {editingTaskId === task.id ? (
              <form
                className="edit-form"
                onSubmit={saveEditedTask}
              >
                <input
                  value={editingTitle}
                  onChange={(event) =>
                    setEditingTitle(event.target.value)
                  }
                  placeholder="Task title"
                  required
                  maxLength={200}
                />

                <div className="edit-options">
                  <select
                    value={editingPriority}
                    onChange={(event) =>
                      setEditingPriority(event.target.value)
                    }
                  >
                    <option value="high">High priority</option>
                    <option value="medium">Medium priority</option>
                    <option value="low">Low priority</option>
                  </select>

                  <select
                    value={editingProject}
                    onChange={(event) =>
                      setEditingProject(event.target.value)
                    }
                  >
                    {projects.map((project) => (
                      <option
                        key={project.id}
                        value={project.id}
                      >
                        {project.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={editingDueDate}
                    onChange={(event) =>
                      setEditingDueDate(event.target.value)
                    }
                  />
                </div>

                <div className="task-actions">
                  <button
                    className="primary-button"
                    type="submit"
                  >
                    Save Changes
                  </button>

                  <button
                    className="secondary-button"
                    type="button"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="task-main">
                  <button
                    className={`complete-button ${
                      task.completed ? "is-complete" : ""
                    }`}
                    onClick={() => toggleComplete(task.id)}
                    aria-label={
                      task.completed
                        ? "Mark as pending"
                        : "Mark as complete"
                    }
                    title="Toggle completion"
                  >
                    {task.completed ? "✓" : ""}
                  </button>

                  <div className="task-information">
                    <h3
                      className={
                        task.completed ? "completed-title" : ""
                      }
                    >
                      {task.title}
                    </h3>

                    <div className="task-meta">
                      <span
                        className={`priority ${getPriority(
                          task.priority
                        )}`}
                      >
                        {getPriority(task.priority)}
                      </span>

                      <span>
                        {getProjectName(task.projectId)}
                      </span>

                      {task.dueDate && (
                        <span>
                          Due {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="task-actions">
                  <button
                    className="text-button"
                    onClick={() => editTask(task)}
                  >
                    Edit Task
                  </button>

                  <button
                    className="delete-button"
                    onClick={() => deleteTask(task.id)}
                    aria-label="Delete task"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ====================================================
  // DASHBOARD PAGE
  // ====================================================

  function renderDashboard() {
    return (
      <>
        <section className="welcome-section">
          <div>
            <p className="eyebrow">YOUR WORKSPACE</p>

            <h1>
              Welcome back, {displayName.trim() || "Your Name"}!
            </h1>

            <p>
              Here's what's happening with your tasks today.
            </p>
          </div>

          <div className="today-label">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
        </section>

        <section className="summary-grid">
          <div className="summary-card">
            <span className="summary-icon purple">▤</span>
            <p>Total Tasks</p>
            <h2>{totalTasks}</h2>
            <span className="summary-note">All your tasks</span>
          </div>

          <div className="summary-card">
            <span className="summary-icon orange">◷</span>
            <p>Pending Tasks</p>
            <h2>{pendingTasks}</h2>
            <span className="summary-note">
              Still to be completed
            </span>
          </div>

          <div className="summary-card">
            <span className="summary-icon green">✓</span>
            <p>Completed</p>
            <h2>{completedTasks}</h2>
            <span className="summary-note">Tasks finished</span>
          </div>

          <div className="summary-card">
            <span className="summary-icon blue">↗</span>
            <p>Completion Rate</p>
            <h2>{completionPercentage}%</h2>
            <span className="summary-note">Overall progress</span>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="panel progress-panel">
            <div className="panel-heading">
              <div>
                <h2>Overall Progress</h2>
                <p>Your productivity at a glance</p>
              </div>

              <span className="progress-number">
                {completionPercentage}%
              </span>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${completionPercentage}%`,
                }}
              />
            </div>

            <p className="progress-caption">
              {completedTasks} of {totalTasks} tasks completed
            </p>
          </div>

          <div className="panel priority-panel">
            <div className="panel-heading">
              <div>
                <h2>Priority Overview</h2>
                <p>Pending tasks by priority</p>
              </div>
            </div>

            <div className="priority-row">
              <span className="priority high">High</span>
              <strong>{highPriorityTasks}</strong>
            </div>

            <div className="priority-row">
              <span className="priority medium">Medium</span>
              <strong>{mediumPriorityTasks}</strong>
            </div>

            <div className="priority-row">
              <span className="priority low">Low</span>
              <strong>{lowPriorityTasks}</strong>
            </div>
          </div>
        </section>

        <section className="panel task-workspace">
          <div className="panel-heading task-heading">
            <div>
              <h2>Task Workspace</h2>
              <p>Organize and manage your daily work</p>
            </div>
          </div>

          {renderTaskControls()}
          {renderTaskList(filteredTasks)}
        </section>
      </>
    );
  }

  // ====================================================
  // REUSABLE TASK CONTROLS
  // ====================================================

  function renderTaskControls() {
    return (
      <>
        <form
          className="add-task-form"
          onSubmit={addTask}
        >
          <input
            type="text"
            placeholder="What do you need to get done?"
            value={taskInput}
            onChange={(event) =>
              setTaskInput(event.target.value)
            }
            required
            maxLength={200}
          />

          <select
            value={taskPriority}
            onChange={(event) =>
              setTaskPriority(event.target.value)
            }
          >
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>

          <select
            value={taskProject}
            onChange={(event) =>
              setTaskProject(event.target.value)
            }
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={taskDueDate}
            onChange={(event) =>
              setTaskDueDate(event.target.value)
            }
            aria-label="Task due date"
          />

          <button
            className="primary-button"
            type="submit"
          >
            + Add Task
          </button>
        </form>

        <div className="task-toolbar">
          <input
            className="search-input"
            type="search"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />

          <div className="filter-buttons">
            {["all", "pending", "completed"].map((item) => (
              <button
                key={item}
                type="button"
                className={
                  filter === item ? "filter-active" : ""
                }
                onClick={() => setFilter(item)}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ====================================================
  // MY TASKS PAGE
  // ====================================================

  function renderTasksPage() {
    return (
      <section className="panel task-workspace">
        <div className="page-heading">
          <div>
            <h1>My Tasks</h1>
            <p>All your tasks in one place.</p>
          </div>
        </div>

        {renderTaskControls()}
        {renderTaskList(filteredTasks)}
      </section>
    );
  }

  // ====================================================
  // PROJECTS PAGE
  // ====================================================

  function renderProjectsPage() {
    return (
      <section className="page-content">
        <div className="page-heading">
          <div>
            <h1>Projects</h1>
            <p>Group your tasks into meaningful projects.</p>
          </div>
        </div>

        <form
          className="project-form"
          onSubmit={addProject}
        >
          <input
            value={projectInput}
            onChange={(event) =>
              setProjectInput(event.target.value)
            }
            placeholder="Enter a project name..."
            required
            maxLength={100}
          />

          <button
            className="primary-button"
            type="submit"
          >
            + Create Project
          </button>
        </form>

        <div className="project-grid">
          {projects.map((project) => {
            const projectTasks = tasks.filter(
              (task) => task.projectId === project.id
            );

            const finished = projectTasks.filter(
              (task) => task.completed
            ).length;

            const percentage =
              projectTasks.length === 0
                ? 0
                : Math.round(
                    (finished / projectTasks.length) * 100
                  );

            return (
              <div className="project-card" key={project.id}>
                <div className="project-card-top">
                  <span className="project-icon">▦</span>

                  <span className="project-count">
                    {projectTasks.length} tasks
                  </span>
                </div>

                <h2>{project.name}</h2>

                <p>
                  {finished} completed ·{" "}
                  {projectTasks.length - finished} pending
                </p>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>

                <span className="project-progress">
                  {percentage}% complete
                </span>

                <button
                  className="text-button"
                  onClick={() => {
                    setTaskProject(project.id);
                    changeView("tasks");
                  }}
                >
                  View tasks →
                </button>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // ====================================================
  // CALENDAR PAGE
  // ====================================================

  function renderCalendarPage() {
    return (
      <section className="panel calendar-panel">
        <div className="page-heading calendar-heading">
          <div>
            <h1>Calendar</h1>
            <p>See your tasks by their due dates.</p>
          </div>

          <div className="calendar-controls">
            <button
              className="secondary-button"
              onClick={() => changeCalendarMonth(-1)}
            >
              ←
            </button>

            <strong>
              {calendarMonth.toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </strong>

            <button
              className="secondary-button"
              onClick={() => changeCalendarMonth(1)}
            >
              →
            </button>
          </div>
        </div>

        <div className="calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
            (day) => (
              <div className="calendar-weekday" key={day}>
                {day}
              </div>
            )
          )}

          {calendarDays.map((day, index) => {
            const dateString = day
              ? getDateString(day)
              : null;

            const dayTasks = tasks.filter(
              (task) => task.dueDate === dateString
            );

            return (
              <div
                className="calendar-day"
                key={`${dateString}-${index}`}
              >
                {day && (
                  <>
                    <span className="calendar-date">
                      {day}
                    </span>

                    {dayTasks.map((task) => (
                      <div
                        className={`calendar-task ${
                          task.completed
                            ? "calendar-task-done"
                            : ""
                        }`}
                        key={task.id}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <p className="calendar-help">
          Tasks appear here when you give them a due date.
        </p>
      </section>
    );
  }

  // ====================================================
  // ANALYTICS PAGE
  // ====================================================

  function renderAnalyticsPage() {
    const priorityTotal =
      highPriorityTasks +
      mediumPriorityTasks +
      lowPriorityTasks;

    const priorityWidth = (amount) =>
      priorityTotal === 0
        ? 0
        : (amount / priorityTotal) * 100;

    return (
      <section className="page-content">
        <div className="page-heading">
          <div>
            <h1>Analytics</h1>
            <p>A simple overview of your productivity.</p>
          </div>
        </div>

        <div className="summary-grid analytics-summary">
          <div className="summary-card">
            <p>Total Tasks</p>
            <h2>{totalTasks}</h2>
          </div>

          <div className="summary-card">
            <p>Completed Tasks</p>
            <h2>{completedTasks}</h2>
          </div>

          <div className="summary-card">
            <p>Pending Tasks</p>
            <h2>{pendingTasks}</h2>
          </div>

          <div className="summary-card">
            <p>Completion Rate</p>
            <h2>{completionPercentage}%</h2>
          </div>
        </div>

        <div className="panel analytics-panel">
          <h2>Task Completion</h2>
          <p>Completed compared with pending tasks.</p>

          <div className="analytics-bar">
            <div
              className="analytics-completed"
              style={{
                width: `${completionPercentage}%`,
              }}
            />
          </div>

          <div className="analytics-legend">
            <span>Completed: {completedTasks}</span>
            <span>Pending: {pendingTasks}</span>
          </div>
        </div>

        <div className="panel analytics-panel">
          <h2>Pending Task Priorities</h2>
          <p>Understand where your attention is needed.</p>

          {[
            {
              name: "High",
              count: highPriorityTasks,
              className: "high-bar",
            },
            {
              name: "Medium",
              count: mediumPriorityTasks,
              className: "medium-bar",
            },
            {
              name: "Low",
              count: lowPriorityTasks,
              className: "low-bar",
            },
          ].map((item) => (
            <div
              className="analytics-priority"
              key={item.name}
            >
              <div className="analytics-priority-label">
                <span>{item.name}</span>
                <strong>{item.count}</strong>
              </div>

              <div className="analytics-bar">
                <div
                  className={item.className}
                  style={{
                    width: `${priorityWidth(item.count)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ====================================================
  // SETTINGS PAGE
  // ====================================================

  function renderSettingsPage() {
    return (
      <section className="page-content">
        <div className="page-heading">
          <div>
            <h1>Settings</h1>
            <p>Manage your TaskOrbit preferences.</p>
          </div>
        </div>

        <div className="panel settings-panel">
          <h2>Profile</h2>
          <p>Choose the name displayed in your workspace.</p>

          <label htmlFor="display-name">
            Display name
          </label>

          <input
            id="display-name"
            value={displayName}
            onChange={(event) =>
              setDisplayName(event.target.value)
            }
            placeholder="Enter your name"
            maxLength={60}
          />

          <div className="settings-avatar-preview">
            <div className="profile-avatar">Y</div>
            <span>The avatar will always display Y.</span>
          </div>
        </div>

        <div className="panel settings-panel">
          <h2>Notifications</h2>
          <p>Control task reminders shown inside TaskOrbit.</p>

          <label className="setting-toggle">
            <span>
              <strong>In-app notifications</strong>
              <small>
                Show high-priority and due-date reminders.
              </small>
            </span>

            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(event) => {
                const isEnabled = event.target.checked;

                setNotificationsEnabled(isEnabled);

                // Close the dropdown immediately when notifications
                // are disabled in Settings.
                if (!isEnabled) {
                  setShowNotifications(false);
                }
              }}
            />
          </label>
        </div>
      </section>
    );
  }

  // ====================================================
  // SELECT THE CURRENT PAGE
  // ====================================================

  function renderCurrentView() {
    switch (activeView) {
      case "tasks":
      case "completed":
        return renderTasksPage();

      case "projects":
        return renderProjectsPage();

      case "calendar":
        return renderCalendarPage();

      case "analytics":
        return renderAnalyticsPage();

      case "settings":
        return renderSettingsPage();

      case "dashboard":
      default:
        return renderDashboard();
    }
  }

  const currentPageTitle =
    navigationItems.find(
      (item) => item.id === activeView
    )?.label || "Overview";

  // ====================================================
  // MAIN APPLICATION LAYOUT
  // ====================================================

  return (
    <div className="app-layout">
      {/* LEFT SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">T</div>
          <span>TaskOrbit</span>
        </div>

        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-navigation">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${
                activeView === item.id ? "nav-active" : ""
              }`}
              onClick={() => changeView(item.id)}
            >
              <span className="nav-icon">
                {item.icon}
              </span>

              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span>✦</span>
            <strong>Stay focused</strong>
            <p>Small steps lead to big results.</p>
          </div>

          <div className="sidebar-profile">
            <div className="profile-avatar">Y</div>

            <div>
              <strong>
                {displayName.trim() || "Your Name"}
              </strong>

              <span>Personal workspace</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-area">
        {/* TOP NAVIGATION BAR */}
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{currentPageTitle}</strong>
          </div>

          <div className="topbar-actions">
            {/* The wrapper contains both the bell and dropdown.
                This allows outside-click detection to work correctly. */}
            <div
              className="notification-wrapper"
              ref={notificationRef}
            >
              <button
                className="notification-button"
                onClick={() => {
                  // Clicking the bell toggles the dropdown.
                  setShowNotifications((previousState) => !previousState);
                }}
                aria-label="Open notifications"
                aria-expanded={showNotifications}
                aria-haspopup="true"
              >
                🔔

                {unreadCount > 0 && (
                  <span className="notification-count">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* NOTIFICATION DROPDOWN */}
              {showNotifications && notificationsEnabled && (
                <div className="notification-dropdown">
                  <div className="notification-heading">
                    <strong>Notifications</strong>

                    <button
                      className="text-button"
                      onClick={markNotificationsRead}
                      disabled={unreadCount === 0}
                    >
                      Mark all read
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="notification-empty">
                      You're all caught up!
                    </p>
                  ) : (
                    notifications.map((item) => {
                      const isRead =
                        readNotificationIds.includes(item.id);

                      return (
                        <div
                          className={`notification-item ${
                            isRead ? "notification-read" : ""
                          }`}
                          key={item.id}
                          onClick={() => openNotification(item)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" ||
                              event.key === " "
                            ) {
                              event.preventDefault();
                              openNotification(item);
                            }
                          }}
                        >
                          <span className="notification-dot" />

                          <div>
                            <strong>{item.message}</strong>
                            <p>{item.detail}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* PROFILE */}
            <div className="topbar-profile">
              <div className="profile-avatar">Y</div>

              <span>
                {displayName.trim() || "Your Name"}
              </span>
            </div>
          </div>
        </header>

        {/* CURRENT PAGE */}
        <div className="content-area">
          {renderCurrentView()}
        </div>

        {/* FOOTER */}
        <footer className="app-footer">
          TaskOrbit <span>·</span> Make every task count.
        </footer>
      </main>
    </div>
  );
}

export default App;
