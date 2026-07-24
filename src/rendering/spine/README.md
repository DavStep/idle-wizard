# Spine Runtime

This rendering feature owns the official Spine PixiJS runtime wrapper.

It loads exported Spine skeleton data (`.skel` preferred, `.json` allowed) plus `.atlas` files through Pixi `Assets`, then creates Spine containers on the existing render layers. Gameplay and page code should enter through `SpineRuntimeFacade`, not import `@esotericsoftware/spine-pixi-v8` directly.

Keep the Spine runtime major/minor version aligned with the Spine Editor version used to export assets. Register the Spine/Pixi render-pipe plugins before the shared `Application.init()` call. Skeleton and atlas assets, plus their Spine containers, remain lazy so ordinary room UI does not fetch or construct animated assets.
