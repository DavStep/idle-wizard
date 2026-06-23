# QA Data

QA data loads local save templates into the current development session.

Templates are served from `public/qa-data/`, which is ignored because copied player
data can be large and local-only. Generate it with `npm run qa:data:from-backup`
or `npm run qa:data:sync`, then load it in a cheat-enabled local browser:

```js
cheats.listDataTemplates()
cheats.loadDataTemplate('ftwizard')
cheats.loadDataTemplate('everything-unlocked')
cheats.loadDataTemplate('level-15')
```

Loading a template applies the gameplay save to the current local identity and
persists through the normal save path. It does not write raw SpacetimeDB rows.
