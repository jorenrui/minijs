class Entity {
  constructor(e) {
    this.element = e, this.tagName = e.tagName, this.initialState = {
      className: e.className
    };
  }
  get variables() {
    const e = MiniJS.variables, t = Array.from(this.element.attributes).map((a) => a.value).join(" ");
    return e.filter((a) => t.includes(a));
  }
  get baseClasses() {
    return this.initialState.className.split(" ");
  }
  _eventAction(e) {
    const t = this.element.getAttribute(e);
    return this._sanitizeExpression(t);
  }
  _sanitizeExpression(e) {
    return this.variables.forEach((t) => {
      e.includes(t) && !e.includes(`proxyWindow.${t}`) && (e = e.replace(t, `proxyWindow.${t}`));
    }), e = e.replace("this", "this.element"), e;
  }
  evaluateEventAction(attrName) {
    eval(this._eventAction(attrName));
  }
  evaluateClass() {
    const classExpr = this.element.getAttribute(":class");
    if (classExpr) {
      const newClassNames = eval(classExpr), classesCombined = [...this.baseClasses, ...newClassNames.split(" ")].join(" ");
      this.element.className = classesCombined;
    }
  }
  evaluateText() {
    const textExpr = this.element.getAttribute(":text");
    if (textExpr) {
      const newText = eval(textExpr);
      newText && (this.element.innerText = newText);
    }
  }
  evaluateValue() {
    const valueExpr = this.element.getAttribute(":value");
    if (valueExpr) {
      const newValue = eval(valueExpr);
      newValue && (this.element.value = newValue);
    }
    const checkedExpr = this.element.getAttribute(":checked");
    if (checkedExpr) {
      const newValue = eval(checkedExpr);
      newValue && (this.element.checked = newValue);
    }
  }
  hasAttribute(e) {
    return !!this.element.getAttribute(e);
  }
}
const MiniJS$1 = (() => {
  const _elements = [], _variables = [], _actionEvents = [":click", ":change", ":input", ":keypress"], _loadEvent = ":load", watchHandler = {
    set: function(e, t, n) {
      return e[t] = n, t[0] === "$" && localStorage.setItem(t, JSON.stringify(n)), _variables.includes(t) && updateStates(t), !0;
    }
  };
  window.proxyWindow = null;
  async function init() {
    await _domReady(), _findElements(), _initializeGlobalVariables(), _setProxyWindow(), _applyBindings(), updateStates();
  }
  function _setProxyWindow() {
    proxyWindow = new Proxy(window, watchHandler);
  }
  function _initializeGlobalVariables() {
    _elements.forEach((entity) => {
      const el = entity.element, loadExpr = el.getAttribute(_loadEvent);
      if (loadExpr) {
        const [varName, varVal] = loadExpr.replace(" ", "").split("=");
        window[varName] = varName.startsWith("$") && JSON.parse(localStorage.getItem(varName)) || void 0, eval(loadExpr), _variables.push(varName);
      } else
        _actionEvents.forEach((e) => {
          const t = el.getAttribute(e);
          if (t) {
            const n = t.match(/(\$?\w+)\s*=\s*/);
            n && !window.hasOwnProperty(n[1]) && (window[n[1]] = n[1].startsWith("$") && JSON.parse(localStorage.getItem(n[1])) || void 0, _variables.push(n[1]));
          }
        });
    });
  }
  function updateStates(e = null) {
    _elements.forEach((t) => {
      (t.variables.includes(e) || e == null) && (t.evaluateValue(), t.evaluateClass(), t.evaluateText());
    });
  }
  function triggerEventChanges(e, t) {
    e.evaluateEventAction(t);
  }
  function _applyBindings() {
    _elements.forEach((e) => {
      const t = e.element;
      t.hasAttribute(":click") && t.addEventListener("click", () => {
        triggerEventChanges(e, ":click");
      }), t.hasAttribute(":change") && (t.type == "checkbox" || t.tagName == "select" ? t.addEventListener("change", () => {
        triggerEventChanges(e, ":change");
      }) : t.addEventListener("input", () => {
        triggerEventChanges(e, ":change");
      })), document.addEventListener("click", function(n) {
        e.hasAttribute(":clickout") && !e.element.contains(n.target) && e.evaluateEventAction(":clickout");
      });
    });
  }
  function _findElements() {
    const e = document.evaluate(
      '//*[@*[starts-with(name(), ":")]]',
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    for (let t = 0; t < e.snapshotLength; t++) {
      const n = new Entity(e.snapshotItem(t));
      _elements.push(n);
    }
  }
  function _domReady() {
    return new Promise((e) => {
      document.readyState == "loading" ? document.addEventListener("DOMContentLoaded", e) : e();
    });
  }
  return init().catch((e) => {
    console.error("Error initializing MiniJS:", e);
  }), {
    get elements() {
      return [..._elements];
    },
    get variables() {
      return [..._variables];
    }
  };
})();
window.MiniJS = MiniJS$1;
