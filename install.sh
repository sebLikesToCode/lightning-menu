#!/bin/bash
# Put lm where the system expects it, without copying anything: everything
# is symlinked back to this repo so edits here are live.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
UUID="lmplace@sebastian"

mkdir -p ~/.local/bin ~/.config/systemd/user \
         "$HOME/.local/share/gnome-shell/extensions/$UUID"

ln -sfn "$HERE/lm" ~/.local/bin/lm
ln -sfn "$HERE/bin/whatbutton" ~/.local/bin/whatbutton
ln -sfn "$HERE/systemd/ydotoold.service" \
        ~/.config/systemd/user/ydotoold.service
ln -sfn "$HERE/systemd/lm.service" ~/.config/systemd/user/lm.service

# Files, not the directory: a real directory with symlinked files inside is
# the lower-risk shape for GNOME Shell's extension loader.
for f in extension.js metadata.json; do
  ln -sfn "$HERE/gnome-extension/$UUID/$f" \
          "$HOME/.local/share/gnome-shell/extensions/$UUID/$f"
done

systemctl --user daemon-reload
systemctl --user enable --now ydotoold lm

echo "linked. still to do by hand:"
echo
echo "  1. enable the extension (needs a logout to take effect):"
echo "       gnome-extensions enable $UUID"
echo
echo "  2. bind a key:"
echo "       Settings > Keyboard > Custom Shortcuts > +"
echo "       command:  $HOME/.local/bin/lm"
echo
echo "  3. optional, a mouse button: input-remapper-gtk,"
echo "     map a spare button to the same combo"
