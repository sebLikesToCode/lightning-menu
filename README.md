# lm

A pop-up menu that acts on whatever text is highlighted, and a place to put
desktop utilities. Bound to a key or a remapped mouse button: highlight
something, press, pick an action.

Built for **GNOME 50 on Wayland**. Several decisions below only make sense
there, and are noted as such.

## What it does

Reads the **PRIMARY selection** — whatever is highlighted right now — so
there is no copying step. Falls back to the clipboard when nothing is
highlighted.

| Action | |
|---|---|
| **Calculate** | sympy. Worksheet typography, algebra, equations, systems, calculus, matrices, vectors |
| **Translate** | detects the source language, 24 targets with type-to-search |
| **Define** | definitions per sense, synonyms, antonyms, IPA |
| **Bases** | `0x7E` `0b1011` `0o176` `7Eh`, binary grouped in fours |
| **Format JSON** | pretty-prints, or minifies input that is already laid out; reads Python reprs too |
| **Change case** | camel, Pascal, snake, SCREAMING, kebab, Title |
| **Convert units** | length, mass, volume, time, speed, area, data, energy, pressure, angle, temperature |
| **Times and time zones** | epoch / ISO / `14:30`, then 15 cities |
| **Inspect characters** | codepoint, name, category, HTML entity, UTF-8/16, NFC check |
| **Hashes / checksums** | digests, and **verifies** a `<digest>  <filename>` line against the file |
| **Select all in that window** | Ctrl+A then Ctrl+Insert in the window you came from |
| **Screenshot** | GNOME's own capture UI; image lands on the clipboard |
| **Search the web** · **Open file or link** · **Copy** | |

Results appear inline under the action, with **Copy** and **Replace
selection**. Both act on whatever you highlight *inside* the result, so a
multi-row output (Change case, Bases) lets you take one line.

### Calculate, in more detail

Real notation in and out: `× ÷ − √ ∛ ∜ π ∞ ½ ⌊⌋ ⌈⌉ |x| ° ± ≤ ≥ ≠`,
superscripts, subscripts, thousands separators, `15% of 80`.

- `800 x 222` is multiplication; `8x²` is the variable. The rule is whether a
  number sits on **both** sides.
- Worksheet wrappers are stripped: `1. solve a + b + c`,
  `Q1) solve for x: 3x − 6 = 0`, `find the value of x:`, `Exercise 3:`
- Systems: `2x + y = 7, x − y = 2`
- Imaginary: `x² + 9 = 0` → `x = −3i`, `x = 3i`
- Calculus: `∫ x² dx`, `∫_0^1 x² dx`, `d/dx x³`, `∂/∂x`, `∑_(n=1)^∞ (1÷2)^n`
- Matrices: `det ((1,2),(3,4))`, `|M|`, `M^-1`, `transpose`, `rank`, `trace`,
  `rref`, `eigenvalues`, `nullspace`, `A * B`. A bare matrix gets a summary.
- Vectors: `[1,2,3] · [4,5,6]` (with magnitudes and the angle),
  `[1,0,0] × [0,1,0]`
- Substitution with working shown, `=` signs aligned on the fraction bar:

```
x = −1,   y = 900          900 ÷ 2212 + 800 × 222
                         = 177600.406872
  8x² − 8xy
= 8 × (−1)² − 8 × (−1) × (900)        98213025
= 8 + 7200                    exact: ────────
= 7208                                  553
```

Symbols it does **not** implement say so rather than treating them as
variables — `∬ ∭ ∮ ∇`, set theory, logic, geometry relations. A confident
wrong answer is worse than a refusal.

## Requirements

```
sudo apt install python3-sympy wl-clipboard translate-shell \
                 ydotool xdotool libnotify-bin
```

- `python3-sympy` — Calculate. Without it, arithmetic only (via a restricted
  AST evaluator, never `eval`)
- `wl-clipboard` — reading the selection
- `translate-shell` — Translate and Define
- `ydotool` — Replace selection, Select all
- `xdotool` — the fallback window placement only
- GTK 4 with PyGObject (`python3-gi`), normally already present on GNOME

## Install

```sh
./install.sh
```

That symlinks `lm` onto your PATH, installs the shell extension and the
`ydotoold` user service, and prints the remaining manual steps (the
keybinding, and the mouse-button mapping if you want one).

**The extension needs a logout** — Wayland cannot reload the shell in place.

## Design notes

Things that are not obvious and cost real time to work out.

**A Wayland client cannot place its own window, or find the pointer.** There
is no protocol for either. `xdotool` answers under XWayland but its answer is
*stale* — it only learns the pointer from X11 clients, so with Wayland-native
apps under the cursor it returns the same coordinates for hours. The only way
through is a shell extension: inside the compositor `global.get_pointer()` is
live and Mutter can move any window. That is all `gnome-extension/` is for —
one D-Bus method, no UI, no timers.

**`wl-copy` steals focus.** On GNOME a client must own a focused surface to
take the clipboard, so `wl-copy` briefly takes it — and a menu that dismisses
itself on focus loss will throw away the result it just produced. Set the
clipboard in-process with `Gdk.Clipboard` while the window is open, and hand
off to `wl-copy` only on the way out, so the offer outlives the process.

**Dismiss-on-focus-loss must be debounced.** Notifications and clipboard
helpers take focus for a moment without the user having clicked anywhere.

**Ctrl+Insert, never Ctrl+C.** In a terminal Ctrl+C sends SIGINT and would
interrupt whatever is running. Ctrl+Insert means copy in GTK, Qt, browsers
and VTE alike.

**Replace pastes; it does not retype.** Reading PRIMARY does not clear the
selection, so the original text is still selected in the source window and
Ctrl+V overwrites exactly that span. Counting backspaces would have to guess.

**`fuzzel`, `wofi` and `rofi` are unusable here.** All are
`wlr-layer-shell` clients and Mutter does not implement that protocol. Hence
a plain GTK window.

**`org.gnome.Shell.Screenshot` answers `AccessDenied`** for ordinary
callers. Screenshots go through the XDG portal, which is what the Print key
uses.

**Long unbreakable tokens need `WrapMode.WORD_CHAR`.** A 128-character hex
digest is one word with no break opportunity, so word wrapping cannot split
it and the label demands its full width — which stretched the window past
1000px.

## Adding a utility

1. `def act_thing(t):` — return a string to display, `None` to act and
   close, or a `Panel` subclass when it needs its own widgets.
   `TranslatePanel` and `ShotPanel` are the worked examples.
2. Add `("Thing", act_thing)` to `ACTIONS`.
3. Add it to `_MONO_ACTIONS` if its output is aligned columns.

It is a fresh process on every keypress, so there is nothing to reload.

## Not done

- **Offline fallbacks.** Translate and Define need the network. An offline
  dictionary (`sdcv`) is feasible; offline translation needs real models.
- **Windows.** The whole placement and input layer is GNOME/Wayland
  specific. The maths, units, hashes and character inspection are portable;
  the window handling is not.
