# Four-frame creature walk: the Gemini prompt that works (Round 357)

Paste this, changing the creature paragraph and the gait line. Generate 3-4 times and keep the best; if one frame is
wrong, reply in the same chat: "Keep everything identical, but redraw only the bottom-left frame so ...".
Then: `python3 tools/strip_to_sheet.py draft.png assets/monsters/<world>/<name>.png --grid 2 --align 1`.

> A 16-bit pixel-art walk cycle sprite sheet, like a classic SNES game, of one enemy creature: 4 frames in a 2×2 grid on
> a square image, read left to right, top to bottom. Every frame is the same size, evenly spaced, with the creature
> centered and large.
>
> The creature: [two sentences: body, head, materials, glowing details]. [Neon cyan and pink rim light.] Shown in a
> strict side view facing right, exactly the same design in all 4 frames.
>
> It [walks like a rhinoceros, a heavy four-legged walk]:
> 1. Stepping: near front leg forward, near back leg back.
> 2. Passing: legs crossing under the body, body raised a little.
> 3. Stepping the other way: near front leg back, near back leg forward.
> 4. Passing: legs crossing under the body, body lowered a little.
>
> Far-side legs are a darker shade of the same colours, partly behind the body. Frames 1 and 3 must look clearly
> different.
>
> Flat solid bright green (#00FF00) background everywhere, no ground, no shadow, no grid lines, no numbers, no text.

Two legs: "1. Left leg forward, right arm forward. 2. Legs passing, body raised a little. 3. Right leg forward, left arm
forward. 4. Legs passing, body lowered a little." Floating: "1. Highest point. 2. Drifting down. 3. Lowest point.
4. Drifting up", plus a cloak, tendrils or rings that trail differently in each frame.
