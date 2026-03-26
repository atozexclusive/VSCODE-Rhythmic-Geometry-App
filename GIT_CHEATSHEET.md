# Git Cheat Sheet

Current safe starting point:

```bash
git log --oneline -n 1
```

## Check current status

```bash
git status
```

## Make a safe checkpoint before a risky change

```bash
git add .
git commit -m "Checkpoint before risky change"
```

Example:

```bash
git commit -m "Checkpoint before Codex UI experiment"
```

## View commit history

```bash
git log --oneline --decorate
```

## See what changed

```bash
git diff
```

## Restore the project to the last committed version

Warning: this deletes uncommitted changes.

```bash
git reset --hard HEAD
```

## Restore the project to an older known-good commit

Warning: this deletes uncommitted changes.

```bash
git reset --hard <commit-id>
```

Example:

```bash
git reset --hard 7f3395c
```

## Look at an older commit without permanently moving your branch

```bash
git checkout <commit-id>
```

Return to your main branch:

```bash
git checkout main
```

## Recommended simple workflow

1. Run `git status`
2. Run `git add .`
3. Run `git commit -m "Checkpoint before <change>"`
4. Ask Codex to make the change
5. If the result is bad, run `git reset --hard <last-good-commit>`
6. If the result is good, make another commit
