# Spine Runtime

This rendering feature owns the official Spine PixiJS runtime wrapper.

It loads exported Spine skeleton data (`.skel` preferred, `.json` allowed) plus `.atlas` files through Pixi `Assets`, then creates Spine containers on the existing render layers. Gameplay and page code should enter through `SpineRuntimeFacade`, not import `@esotericsoftware/spine-pixi-v8` directly.

Keep the Spine runtime major/minor version aligned with the Spine Editor version used to export assets. The runtime is lazy-loaded so normal room UI does not pay for Spine unless an animated asset is requested.
