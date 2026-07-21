const sourceFiles = {
  ...import.meta.glob('../../../app/**/*.js', {
    eager: true,
    import: 'default',
    query: '?raw',
  }),
  ...import.meta.glob('../../../pages/**/*.js', {
    eager: true,
    import: 'default',
    query: '?raw',
  }),
  ...import.meta.glob('../../../viewport/**/*.js', {
    eager: true,
    import: 'default',
    query: '?raw',
  }),
};

export class UiEditorSourceIndexManager {
  constructor({ files = sourceFiles } = {}) {
    this.files = Object.entries(files).filter(
      ([path]) => !path.endsWith('.test.js'),
    );
    this.cache = new Map();
  }

  findForElement(element) {
    const classNames = [...(element?.classList ?? [])].filter(
      (className) => !className.startsWith('is-'),
    ).sort((left, right) => this.rankClass(left) - this.rankClass(right));

    for (const className of classNames) {
      const matches = this.findClass(className);

      if (matches.length > 0) {
        return matches[0];
      }
    }

    return null;
  }

  findClass(className) {
    if (this.cache.has(className)) {
      return this.cache.get(className);
    }

    const matches = this.files
      .filter(([, source]) => typeof source === 'string' && source.includes(className))
      .map(([path]) => ({
        path: this.normalizePath(path),
        widget: this.getWidgetName(path),
      }))
      .sort((left, right) => this.rank(left.path) - this.rank(right.path));

    this.cache.set(className, matches);
    return matches;
  }

  normalizePath(path) {
    const relativePath = path.replace(/^\.\.\/\.\.\/\.\.\//, 'src/');
    return relativePath.replaceAll('\\', '/');
  }

  getWidgetName(path) {
    return path.split('/').at(-1)?.replace(/\.js$/, '') ?? 'DOM element';
  }

  rank(path) {
    if (path.includes('/managers/') && path.includes('ViewManager')) {
      return 0;
    }

    if (path.includes('/managers/')) {
      return 1;
    }

    return 2;
  }

  rankClass(className) {
    if (className.includes('__') && !className.startsWith('style-')) {
      return 0;
    }

    if (!className.startsWith('style-')) {
      return 1;
    }

    return 2;
  }
}
