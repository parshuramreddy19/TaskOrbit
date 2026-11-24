
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import App from "./App";

// Run before every test to prevent old tasks affecting results.
beforeEach(() => {
  localStorage.clear();
});

describe("TaskOrbit Application", () => {

  // Test 1: Check whether the application renders.
  test("renders the TaskOrbit application", () => {
    render(<App />);

    expect(
      screen.getAllByText(/TaskOrbit/i).length
    ).toBeGreaterThan(0);
  });

  // Test 2: Check whether a user can add a new task.
  test("allows a user to add a task", async () => {
    const user = userEvent.setup();

    render(<App />);

    // Find the task input field.
    const taskInput = screen.getByPlaceholderText(
      "What do you need to get done?"
    );

    // Enter a task name.
    await user.type(taskInput, "Prepare interview notes");
  
    // Click the Add Task button.
    await user.click(
      screen.getByRole("button", { name: /add task/i })
    );
  
    // Verify that the new task appears on the screen.
    expect(
      screen.getByText("Prepare interview notes")
    ).toBeInTheDocument();
  });

  // Test 3: Check whether a user can complete a task.
  test("allows a user to complete a task", async () => {
    const user = userEvent.setup();

    render(<App />);

    // Add a task.
    await user.type(
      screen.getByPlaceholderText("What do you need to get done?"),
      "Complete React practice"
    );

    await user.click(
      screen.getByRole("button", { name: /add task/i })
    );

    // Find the completion button for this task.
    const completeButton = screen.getByRole("button", {
      name: "Mark as complete",
    });

    // Click to complete the task.
    await user.click(completeButton);

    // The button label should now change.
    expect(
      screen.getByRole("button", { name: "Mark as pending" })
    ).toBeInTheDocument();
  });

  // Test 4: Check whether a user can undo task completion.
  test("allows a user to undo task completion", async () => {
    const user = userEvent.setup();

    render(<App />);

    // Add a task.
    await user.type(
      screen.getByPlaceholderText("What do you need to get done?"),
      "Review JavaScript"
    );

    await user.click(
      screen.getByRole("button", { name: /add task/i })
    );

    // Complete the task.
    await user.click(
      screen.getByRole("button", { name: "Mark as complete" })
    );

    // Undo completion.
    await user.click(
      screen.getByRole("button", { name: "Mark as pending" })
    );

    // Verify that the task can be marked complete again.
    expect(
      screen.getByRole("button", { name: "Mark as complete" })
    ).toBeInTheDocument();
  });

  // Test 5: Check whether a user can edit an existing task.
  test("allows a user to edit a task", async () => {
    const user = userEvent.setup();

    render(<App />);

    // Add an original task.
    await user.type(
      screen.getByPlaceholderText("What do you need to get done?"),
      "Learn React"
    );

    await user.click(
      screen.getByRole("button", { name: /add task/i })
    );

    // Click the Edit Task button.
    await user.click(
      screen.getByRole("button", { name: "Edit Task" })
    );

    // Find the editing input and replace the task title.
    const editInput = screen.getByPlaceholderText("Task title");

    await user.clear(editInput);
    await user.type(editInput, "Learn React and Testing");

    // Save the changes.
    await user.click(
      screen.getByRole("button", { name: "Save Changes" })
    );

    // Verify the updated title appears.
    expect(
      screen.getByText("Learn React and Testing")
    ).toBeInTheDocument();
  });

  // Test 6: Check whether a user can delete a task.
  test("allows a user to delete a task", async () => {
    const user = userEvent.setup();

    render(<App />);

    // Add a task.
    await user.type(
      screen.getByPlaceholderText("What do you need to get done?"),
      "Delete this task"
    );

    await user.click(
      screen.getByRole("button", { name: /add task/i })
    );

    // Confirm that the task exists.
    expect(
      screen.getByText("Delete this task")
    ).toBeInTheDocument();

    // Click the Delete button.
    await user.click(
      screen.getByRole("button", { name: "Delete task" })
    );

    // Verify that the task has disappeared.
    expect(
      screen.queryByText("Delete this task")
    ).not.toBeInTheDocument();
  });

  // Test 7: Check whether task search works.
  test("allows a user to search for tasks", async () => {
    const user = userEvent.setup();

    render(<App />);

    // Add the first task.
    const taskInput = screen.getByPlaceholderText(
      "What do you need to get done?"
    );

    await user.type(taskInput, "Learn JavaScript");
    await user.click(
      screen.getByRole("button", { name: /add task/i })
    );

    // Add another task.
    await user.type(taskInput, "Learn Python");
    await user.click(
      screen.getByRole("button", { name: /add task/i })
    );

    // Search for JavaScript.
    await user.type(
      screen.getByPlaceholderText("Search tasks..."),
      "JavaScript"
    );

    // Only the matching task should appear.
    expect(screen.getByText("Learn JavaScript")).toBeInTheDocument();
    expect(screen.queryByText("Learn Python")).not.toBeInTheDocument();
  });

  // Test 8: Check whether task filters work.
  test("allows a user to filter pending and completed tasks", async () => {
    const user = userEvent.setup();

    render(<App />);

    const taskInput = screen.getByPlaceholderText(
      "What do you need to get done?"
    );

    // Add the first task.
    await user.type(taskInput, "Pending task");
    await user.click(
      screen.getByRole("button", { name: /add task/i })
    );

    // Add the second task.
    await user.type(taskInput, "Completed task");
    await user.click(
      screen.getByRole("button", { name: /add task/i })
    );

    // Complete the second task.
    const completeButtons = screen.getAllByRole("button", {
      name: "Mark as complete",
    });

    await user.click(completeButtons[1]);

    // Show completed tasks.
    await user.click(
      screen.getByRole("button", { name: "Completed" })
    );

    expect(screen.getByText("Completed task")).toBeInTheDocument();
    expect(screen.queryByText("Pending task")).not.toBeInTheDocument();

    // Show pending tasks.
    await user.click(
      screen.getByRole("button", { name: "Pending" })
    );

    expect(screen.getByText("Pending task")).toBeInTheDocument();
    expect(screen.queryByText("Completed task")).not.toBeInTheDocument();
  });

  // Test 9: Check whether tasks are saved in Local Storage.
  test("saves tasks in Local Storage", async () => {
    const user = userEvent.setup();

    render(<App />);

    // Add a task.
    await user.type(
      screen.getByPlaceholderText("What do you need to get done?"),
      "Check Local Storage"
    );

    await user.click(
      screen.getByRole("button", { name: /add task/i })
    );

    // Wait for React's useEffect to save the task.
    await waitFor(() => {
      const savedTasks = JSON.parse(
        localStorage.getItem("taskorbit-tasks")
      );

      expect(
        savedTasks.some(
          (task) => task.title === "Check Local Storage"
        )
      ).toBe(true);
    });
  });

});
