const TOKEN = {
  identifier: 'identifier',
  method: 'method',
  operator: 'operator',
  separator: 'separator',
  number: 'number',
  boolean: 'boolean',
  string: 'string',
  whitespace: 'whitespace',
  reservedWord: 'reserved word',
  comment: 'comment',
  multiComment: 'multi comment',
}

const RULE = {
  replace: 'replace',
}

const RESERVED_KEYWORDS = ['await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'undefined', 'package', 'private', 'protected', 'public', 'return', 'super', 'switch', 'static', 'this', 'throw', 'try', 'true', 'typeof', 'var', 'void', 'while', 'with', 'yield']

export default class Lexer {
  static TOKEN = TOKEN

  constructor(code) {
    this._code = code
    this._tokens = []
    this._rules = []
    this._hasRan = false
  }

  _pushToken(type, value, index) {
    if (value.length === 0) return;
    if (type === TOKEN.identifier) {
      if (['true', 'false'].includes(value))
        type = TOKEN.boolean
      else {
        const lastToken = this._tokens.at(-1)
        if (lastToken != null && lastToken.value === '.' && lastToken.type === TOKEN.operator)
          type = TOKEN.method
        else if (RESERVED_KEYWORDS.includes(value))
          type = TOKEN.reservedWord
      }
    }

    this._tokens.push({ type, value, index })
  }

  // get last non whitespace token
  _getLastToken() {
    for (let i = this._tokens.length - 1; i >= 0; i--) {
      const token = this._tokens[i]
      if (token.type !== TOKEN.whitespace)
        return token
    }

    return null
  }

  _tokenize() {
    this._tokens = []

    let currentToken = ''
    let type = null
    let index = 0

    // numbers
    let isDecimal = false

    // strings
    let isStringTemplate = false
    let exitedStringCount = 0

    // objects
    let isObject = false
    let exitedObjectCount = 0

    const pushToken = (...args) => {
      this._pushToken(...args)

      if (isDecimal) isDecimal = false
      currentToken = ''
      type = null
    };
    
    for (let i = 0; i < this._code.length; i++) {
      const char = this._code[i]
      const isLast = i === this._code.length - 1

      // Check if char is the start / end of string
      if (['\'', '"', '`'].includes(char)) {
        const isEscaped = currentToken.endsWith('\\')
        
        if (type === TOKEN.string && !isEscaped) {
          pushToken(type, currentToken, index)
          pushToken(TOKEN.separator, char, i)

          isStringTemplate = false
        } else if (!isEscaped) {
          pushToken(type, currentToken, index)
          pushToken(TOKEN.separator, char, i)
          
          type = TOKEN.string
          index = i

          if (char === '`')
            isStringTemplate = true
        } else {
          currentToken += char
        }

      // Check if type is string
      } else if (type === TOKEN.string) {
        if (currentToken.endsWith('$') && !currentToken.endsWith('\\$')
          && char === '{' && isStringTemplate) {
          pushToken(type, currentToken.slice(0, -1), index)
          pushToken(TOKEN.separator, '${', i)
          exitedStringCount += 1
        } else {
          currentToken += char
        }

      // Check if char is a start of a comment
      } else if (type === TOKEN.operator && char === '/') {
        pushToken(TOKEN.operator, '//', i - 1)
        
        type = TOKEN.comment
        index = i + 1
      
      // Check if char is a start of a multi comment
      } else if (type === TOKEN.operator && char === '*') {
        pushToken(TOKEN.operator, '/*', i - 1)
        
        type = TOKEN.multiComment
        index = i + 1
      
      // Check if type is a comment
      } else if ([TOKEN.comment, TOKEN.multiComment].includes(type)) {
        if ((type === TOKEN.comment && char === '\n')
          || (type === TOKEN.multiComment && currentToken.endsWith('*') && char === '/')) {

          if (type === TOKEN.comment) {
            pushToken(type, currentToken, index)
            pushToken(TOKEN.whitespace, char, i)
          } else if (type === TOKEN.multiComment) {
            pushToken(type, currentToken.slice(0, currentToken.length - 1), index)
            pushToken(TOKEN.operator, '*/', i - 1)
          }
        } else {
          currentToken += char
        }
      
      // Check if char is a letter
      } else if (char.match(/[$a-z]/i)) {
        if (type == null) {
          type = TOKEN.identifier
          index = i

          currentToken += char
        } else if (type === TOKEN.operator || type === TOKEN.whitespace) {
          pushToken(type, currentToken, index)
          type = TOKEN.identifier
          currentToken = char

          if (isObject) {
            const lastToken = this._getLastToken()

            if (lastToken && [',', '{'].includes(lastToken.value))
              type = TOKEN.method
          }
        } else {
          currentToken += char
        }

      // Check if char is a whitespace
      } else if (char.match(/\s/)) {
        if (type === TOKEN.string) {
          currentToken += char
        } else if (type !== TOKEN.whitespace) {
          pushToken(type, currentToken, index)
          type = TOKEN.whitespace
          currentToken = char
        } else if (type === TOKEN.whitespace) {
          currentToken += char
        }

      // Check if char is a dot or bracket notation
      } else if (['.', '[', ']'].includes(char)) {
        if (type === TOKEN.number && !isDecimal) {
          currentToken += char
          isDecimal = true
        } else {
          pushToken(type, currentToken, index)

          const previousToken = this._tokens.at(-1)
          const secondPreviousToken = this._tokens.at(-2)

          const isSpread = previousToken && secondPreviousToken
            && previousToken.value === '.' && secondPreviousToken.value === '.'
            && previousToken.type === TOKEN.operator && secondPreviousToken.type === TOKEN.operator
            && previousToken.index === i - 1 && secondPreviousToken.index === i - 2

          if (isSpread) {
            this._tokens.pop()
            this._tokens.pop()
            pushToken(TOKEN.operator, '...', i - 2)
          } else {            
            pushToken(TOKEN.operator, char, i)
          }
        }

      // Check if char is an operator
      } else if (char.match(/[<>+\-*/%=:?!]/)) {
        if (type == null || type === TOKEN.operator) {
          type = TOKEN.operator
          currentToken += char
        } else {
          pushToken(type, currentToken, index)
          type = TOKEN.operator
          currentToken = char
          index = i
        }
      
      // Check if char is a separator
    } else if (['(', ')', ',', ';', '{', '}'].includes(char)) {
        pushToken(type, currentToken, index)
        
        const lastToken = this._getLastToken()

        if (char === '{' && lastToken) {
          const isArrowFunction = lastToken.type === TOKEN.operator && lastToken.value === '=>'

          if ((lastToken.type === TOKEN.operator && !isArrowFunction) || lastToken.value === '(') {
            isObject = true
            exitedObjectCount += 1
          } else {
            isObject = false
          }
        }

        pushToken(TOKEN.separator, char, i)

        if (char === '}') {
          if (isStringTemplate && exitedStringCount > 0) {
            exitedStringCount -= 1
            type = TOKEN.string
          } else if (isObject) {
            if (exitedObjectCount > 1) {
              exitedObjectCount -= 1
            } else {
              isObject = false
            }
          }
        }
      
      // Check if char is a number
      } else if (char.match(/[0-9]/)) {
        if (type === TOKEN.identifier) {
          currentToken += char
        } else if (type == null || type === TOKEN.number) {
          type = TOKEN.number
          currentToken += char
        } else {
          pushToken(type, currentToken, index)

          type = TOKEN.number
          currentToken = char
          index = i
        }
      }

      if (isLast) pushToken(type, currentToken, index)
    }

    this._hasRan = true
  }

  replace(type, value, replacement) {
    this._rules.push({ rule: RULE.replace, type, value, replacement })
  }

  tokens() {
    this._tokenize()
    return this._tokens
  }

  pick(type) {
    if (!this._hasRan) this._tokenize()
    return this._tokens.filter(token => token.type === type)
  }

  output() {
    if (!this._hasRan) this._tokenize()
    return this._tokens
      .map((token) => {
        for (const rule of this._rules) {
          if (rule.rule === RULE.replace
            && token.type === rule.type
            && token.value === rule.value) {
            token.value = rule.replacement
          }
        }

        return token.value
      })
      .join('');
  }
}