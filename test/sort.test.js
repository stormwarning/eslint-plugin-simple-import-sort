"use strict";

const assert = require("assert");

const { RuleTester } = require("eslint");

const plugin = require("../");

// Hack to allow using `.toMatchInlineSnapshot` for `output` in `RuleTester`.
// https://github.com/eslint/eslint/blob/e18c827cc12cb1c52e5d0aa993f572cb56238704/lib/testers/rule-tester.js#L569
const originalStrictEqual = assert.strictEqual;
assert.strictEqual = (actual, expected, message) => {
  if (message === "Output is incorrect." && typeof expected === "function") {
    expected(actual);
  } else {
    originalStrictEqual(actual, expected, message);
  }
};

// Make snapshots easier to read.
// Before: `"\\"string\\""`
// After: `"string"`
expect.addSnapshotSerializer({
  test: value => typeof value === "string",
  print: value => value,
});

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2015, sourceType: "module" },
});

ruleTester.run("sort", plugin.rules.sort, {
  valid: [
    // Simple cases.
    `import "a"`,
    `import a from "a"`,
    `import {a} from "a"`,
    `import a, {b} from "a"`,
    `import {} from "a"`,
    `import {    } from "a"`,

    // Side-effect only imports are kept in the original order.
    `
import "b";
import "a"
    `.trim(),

    // Sorted alphabetically.
    `
import x1 from "a";
import x2 from "b"
    `.trim(),

    // Opt-out.
    `
// eslint-disable-next-line
import x2 from "b"
import x1 from "a";
    `.trim(),

    // Whitespace before comment at last specifier should stay.
    `
import {
  a, // a
  b // b
} from "specifiers-comment-space"
import {
  c, // c
  d, // d
} from "specifiers-comment-space-2"
    `.trim(),
  ],

  invalid: [
    // Sorting alphabetically.
    {
      code: `
import x2 from "b"
import x1 from "a";
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import x1 from "a";
import x2 from "b"
`);
      },
      errors: 1,
    },

    // Sorting specifiers.
    {
      code: `import { e, b, a as c } from "specifiers"`.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(
          `import { a as c,b, e } from "specifiers"`
        );
      },
      errors: 1,
    },

    // Sorting specifiers with default import.
    {
      code: `import d, { e, b, a as c } from "specifiers-default"`.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(
          `import d, { a as c,b, e } from "specifiers-default"`
        );
      },
      errors: 1,
    },

    // Sorting specifiers with trailing comma.
    {
      code: `import d, { e, b, a as c, } from "specifiers-trailing-comma"`.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(
          `import d, { a as c,b, e,  } from "specifiers-trailing-comma"`
        );
      },
      errors: 1,
    },

    // Sorting specifiers with renames.
    {
      code: `import { a as c, a as b2, b, a } from "specifiers-renames"`.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(
          `import { a,a as b2, a as c, b } from "specifiers-renames"`
        );
      },
      errors: 1,
    },

    // No spaces in specifiers.
    {
      code: `import {e,b,a as c} from "specifiers-no-spaces"`.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(
          `import {a as c,b,e} from "specifiers-no-spaces"`
        );
      },
      errors: 1,
    },

    // Space before specifiers.
    {
      code: `import { b,a} from "specifiers-no-space-before"`.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(
          `import { a,b} from "specifiers-no-space-before"`
        );
      },
      errors: 1,
    },

    // Space after specifiers.
    {
      code: `import {b,a } from "specifiers-no-space-after"`.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(
          `import {a,b } from "specifiers-no-space-after"`
        );
      },
      errors: 1,
    },

    // Space after specifiers.
    {
      code: `import {b,a, } from "specifiers-no-space-after-trailing"`.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(
          `import {a,b, } from "specifiers-no-space-after-trailing"`
        );
      },
      errors: 1,
    },

    // Sorting specifiers with comments.
    {
      code: `
import {
  // c
  c,
  b, // b
  a
  // last
} from "specifiers-comments"
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import {
  a,
  b, // b
  // c
  c
  // last
} from "specifiers-comments"
`);
      },
      errors: 1,
    },

    // Comment after last specifier should stay last.
    {
      code: `
import {
  // c
  c,b, // b
  a
  // last
} from "specifiers-comments-last"
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import {
  a,
b, // b
  // c
  c
  // last
} from "specifiers-comments-last"
`);
      },
      errors: 1,
    },

    // Sorting specifiers with comment between.
    {
      code: `import { b /* b */, a } from "specifiers-comment-between"`.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(
          `import { a,b /* b */ } from "specifiers-comment-between"`
        );
      },
      errors: 1,
    },

    // Sorting specifiers with trailing comma and trailing comments.
    {
      code: `
import {
  c,
  a,
  // x
  // y
} from "specifiers-trailing"
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import {
  a,
  c,
  // x
  // y
} from "specifiers-trailing"
`);
      },
      errors: 1,
    },

    // Sorting specifiers with multiline comments.
    {
      code: `
import {
  /*c1*/ c, /*c2*/ /*a1
  */a, /*a2*/ /*
  after */
  // x
  // y
} from "specifiers-multiline-comments"
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import {
/*a1
  */a, /*a2*/ 
  /*c1*/ c, /*c2*/ /*
  after */
  // x
  // y
} from "specifiers-multiline-comments"
`);
      },
      errors: 1,
    },

    // Sorting specifiers with multiline end comment.
    {
      code: `
import {
  b,
  a /*
  after */
} from "specifiers-multiline-end-comment"
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import {
  a,   b/*
  after */
} from "specifiers-multiline-end-comment"
`);
      },
      errors: 1,
    },

    // Sorting specifiers with multiline end comment after newline.
    {
      code: `
import {
  b,
  a /*a*/
  /*
  after */
} from "specifiers-multiline-end-comment-after-newline"
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import {
  a, /*a*/
  b  /*
  after */
} from "specifiers-multiline-end-comment-after-newline"
`);
      },
      errors: 1,
    },

    // Sorting specifiers with multiline end comment and no newline.
    {
      code: `
import {
  b,
  a /*
  after */ } from "specifiers-multiline-end-comment-no-newline"
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import {
  a,   b/*
  after */ } from "specifiers-multiline-end-comment-no-newline"
`);
      },
      errors: 1,
    },

    // Sorting specifiers with lots of comments.
    {
      code: `/*1*//*2*/import/*3*/def,/*4*/{/*{*/e/*e1*/,/*e2*//*e3*/b/*b1*/,/*b2*/a/*a1*/as/*a2*/c/*a3*/,/*a4*/}/*5*/from/*6*/"specifiers-lots-of-comments"/*7*//*8*/`.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(
          `/*1*//*2*/import/*3*/def,/*4*/{/*{*/a/*a1*/as/*a2*/c/*a3*/,/*a4*/b/*b1*/,/*b2*/e/*e1*/,/*e2*//*e3*/}/*5*/from/*6*/"specifiers-lots-of-comments"/*7*//*8*/`
        );
      },
      errors: 1,
    },

    // Sorting specifiers with lots of comments, multiline.
    {
      code: `
import { // start
  /* c1 */ c /* c2 */, // c3
  // b1

  b as /* b2 */ renamed
  , /* b3 */ /* a1
  */ a /* not-a
  */ // comment at end
} from "specifiers-lots-of-comments-mulitline";
import {
  e,
  d, /* d */ /* not-d
  */ // comment at end after trailing comma
} from "specifiers-lots-of-comments-mulitline-2";
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import { // start
/* a1
  */ a, 
  // b1
  b as /* b2 */ renamed
  , /* b3 */ 
  /* c1 */ c /* c2 */// c3
/* not-a
  */ // comment at end
} from "specifiers-lots-of-comments-mulitline";
import {
  d, /* d */   e,
/* not-d
  */ // comment at end after trailing comma
} from "specifiers-lots-of-comments-mulitline-2";
`);
      },
      errors: 1,
    },

    // No empty line after last specifier due to newline before comma.
    {
      code: `
import {
  b/*b*/
  ,
  a
} from "specifiers-blank";
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import {
  a,
  b/*b*/
  } from "specifiers-blank";
`);
      },
      errors: 1,
    },

    // Sorting both inline and multiline specifiers.
    {
      code: `
import {z, y,
  x,

w,
    v
  as /*v*/

    u , t /*t*/, // t
    s
} from "specifiers-inline-multiline"
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import {    s,
t /*t*/, // t
    v
  as /*v*/
    u , w,
  x,
y,
z} from "specifiers-inline-multiline"
`);
      },
      errors: 1,
    },

    // Indent: 0.
    {
      code: `
import {
b,
a,
} from "specifiers-indent-0"
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import {
a,
b,
} from "specifiers-indent-0"
`);
      },
      errors: 1,
    },

    // Indent: 4.
    {
      code: `
import {
    b,
    a,
} from "specifiers-indent-4"
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import {
    a,
    b,
} from "specifiers-indent-4"
`);
      },
      errors: 1,
    },

    // Indent: tab.
    {
      code: `
import {
\tb,
\ta,
} from "specifiers-indent-tab"
      `.trim(),
      output: actual => {
        expect(actual.replace(/\t/g, "→")).toMatchInlineSnapshot(`
import {
→a,
→b,
} from "specifiers-indent-tab"
`);
      },
      errors: 1,
    },

    // Indent: mixed.
    {
      code: `
import {
 //
\tb,
  a,

    c,
} from "specifiers-indent-mixed"
      `.trim(),
      output: actual => {
        expect(actual.replace(/\t/g, "→")).toMatchInlineSnapshot(`
import {
  a,
 //
→b,
    c,
} from "specifiers-indent-mixed"
`);
      },
      errors: 1,
    },

    // Several chunks.
    {
      code: `
require("c");

import x1 from "b"
import x2 from "a"
require("c");

import x3 from "b"
import x4 from "a" // x4

// c1
require("c");
import x5 from "b"
// x6-1
import x6 from "a" /* after
*/

require("c"); import x7 from "b"; import x8 from "a"; require("c")
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
require("c");

import x2 from "a"
import x1 from "b"
require("c");

import x4 from "a" // x4
import x3 from "b"

// c1
require("c");
// x6-1
import x6 from "a"
import x5 from "b" /* after
*/

require("c"); import x8 from "a";
import x7 from "b"; require("c")
`);
      },
      errors: 4,
    },

    // Original order is preserved for duplicate imports.
    {
      code: `
import b from "b"
import a1 from "a"
import {a2} from "a"
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import a1 from "a"
import {a2} from "a"
import b from "b"
`);
      },
      errors: 1,
    },

    // Original order is preserved for duplicate imports (reversed example).
    {
      code: `
import b from "b"
import {a2} from "a"
import a1 from "a"
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import {a2} from "a"
import a1 from "a"
import b from "b"
`);
      },
      errors: 1,
    },

    // Webpack loader syntax
    {
      code: `
import x1 from "webpack-loader!b"
import x2 from "webpack-loader!./c"
import x3 from "webpack-loader!/d"
import x4 from 'loader1!loader2?query!loader3?{"key":"value!"}!a'
import x5 from "webpack-loader!b"
import x6 from "other-loader!b"
import x7 from "b"
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import x4 from 'loader1!loader2?query!loader3?{"key":"value!"}!a'
import x7 from "b"
import x6 from "other-loader!b"
import x1 from "webpack-loader!b"
import x5 from "webpack-loader!b"

import x3 from "webpack-loader!/d"

import x2 from "webpack-loader!./c"
`);
      },
      errors: 1,
    },

    // Dots and slashes sorting order.
    {
      code: `
import x0 from "";
import x1 from ".";
import x2 from "loader!.";
import x3meh from ".//";
import x3 from "./";
import x4 from "./a";
import x41 from "./ä";
import x5 from "..";
import x6 from "../";
import x7 from "../a";
import x8 from "../..";
import x9 from "../../";
import x10 from "../../a";
import x11 from "/";
import x12 from "/a";
import x13 from "/a/b";
import x14 from "https://example.com/script.js";
import x15 from "http://example.com/script.js";
import x16 from "react";
import x17 from "async";
import x18 from "./a/-";
import x19 from "./a/.";
import x20 from "./a/0";
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import x0 from "";
import x17 from "async";
import x15 from "http://example.com/script.js";
import x14 from "https://example.com/script.js";
import x16 from "react";

import x11 from "/";
import x12 from "/a";
import x13 from "/a/b";

import x10 from "../../a";
import x9 from "../../";
import x8 from "../..";
import x7 from "../a";
import x6 from "../";
import x5 from "..";
import x3meh from ".//";
import x4 from "./a";
import x18 from "./a/-";
import x19 from "./a/.";
import x20 from "./a/0";
import x41 from "./ä";
import x3 from "./";
import x1 from ".";
import x2 from "loader!.";
`);
      },
      errors: 1,
    },

    // Comments.
    {
      code: `
// before

/* also
before */ /* b */ import b from "b" // b
// above d
  import d /*d1*/ from   "d" ; /* d2 */ /* before
  c0 */ // before c1
  /* c0
*/ /*c1*/ /*c2*/import c from 'c' ; /*c3*/ import a from "a" /*a*/ /*
   x1 */ /* x2 */
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
// before

/* also
before */ import a from "a" /*a*/
/* b */ import b from "b" // b
/* before
  c0 */ // before c1
  /* c0
*/ /*c1*/ /*c2*/import c from 'c' ; /*c3*/
// above d
  import d /*d1*/ from   "d" ; /* d2 */ /*
   x1 */ /* x2 */
`);
      },
      errors: 1,
    },

    // Line comment and code after.
    {
      code: `
import b from "b"; // b
import a from "a"; code();
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import a from "a";
import b from "b"; // b
 code();
`);
      },
      errors: 1,
    },

    // Line comment and multiline block comment after.
    {
      code: `
import b from "b"; // b
import a from "a"; /*
after */
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import a from "a";
import b from "b"; // b
 /*
after */
`);
      },
      errors: 1,
    },

    // Line comment but _singleline_ block comment after.
    {
      code: `
import b from "b"; // b
import a from "a"; /* a */
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import a from "a"; /* a */
import b from "b"; // b
`);
      },
      errors: 1,
    },

    // Test messageId, lines and columns.
    {
      code: `
// before
/* also
before */ import b from "b";
import a from "a"; /*a*/ /* comment
after */ // after
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
// before
/* also
before */ import a from "a"; /*a*/
import b from "b"; /* comment
after */ // after
`);
      },
      errors: [
        {
          messageId: "sort",
          line: 3,
          column: 11,
          endLine: 4,
          endColumn: 25,
        },
      ],
    },

    // Collapse blank lines between comments.
    {
      code: `
import c from "c"
// b1

// b2
import b from "b"
// a

import a from "a"
`.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
// a
import a from "a"
// b1
// b2
import b from "b"
import c from "c"
`);
      },
      errors: 1,
    },

    // Collapse blank lines between comments – CR.
    {
      code: `
import c from "c"\r
// b1\r
\r
// b2\r
import b from "b"\r
// a\r
\r
import a from "a"\r
after();\r
`.trim(),
      output: actual => {
        expect(actual.replace(/\r/g, "<CR>")).toMatchInlineSnapshot(`
// a<CR>
import a from "a"<CR>
// b1<CR>
// b2<CR>
import b from "b"<CR>
import c from "c"<CR>
after();
`);
      },
      errors: 1,
    },

    // Collapse blank lines inside import statements.
    {
      code: `
import

// import

def /* default */

,

// default

 {

  // c

  c /*c*/,

  /* b
   */

  b // b
  ,

  // a1

  // a2

  a

  // a3

  as

  // a4

  d

  // a5

  , // a6

  // last

}

// from1

from

// from2

"c"

// final

;
`.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import
// import
def /* default */
,
// default
 {
  // a1
  // a2
  a
  // a3
  as
  // a4
  d
  // a5
  , // a6
  /* b
   */
  b // b
  ,
  // c
  c /*c*/,
  // last
}
// from1
from
// from2
"c"
// final
;
`);
      },
      errors: 1,
    },

    // Collapse blank lines inside empty specifier list.
    {
      code: `
import {

    } from "specifiers-empty"
`.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import {
    } from "specifiers-empty"
`);
      },
      errors: 1,
    },

    // Single-line comment at the end of the last specifier should not comment
    // out the `from` part.
    {
      code: `
import {

  b // b
  ,a} from "specifiers-line-comment"
`.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import {
a,  b // b
  } from "specifiers-line-comment"
`);
      },
      errors: 1,
    },

    // https://github.com/gothinkster/react-redux-realworld-example-app/blob/b5557d1fd40afebe023e3102ad6ef50475146506/src/components/App.js#L1-L16
    {
      code: `
import agent from '../agent';
import Header from './Header';
import React from 'react';
import { connect } from 'react-redux';
import { APP_LOAD, REDIRECT } from '../constants/actionTypes';
import { Route, Switch } from 'react-router-dom';
import Article from '../components/Article';
import Editor from '../components/Editor';
import Home from '../components/Home';
import Login from '../components/Login';
import Profile from '../components/Profile';
import ProfileFavorites from '../components/ProfileFavorites';
import Register from '../components/Register';
import Settings from '../components/Settings';
import { store } from '../store';
import { push } from 'react-router-redux';
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import React from 'react';
import { connect } from 'react-redux';
import { Route, Switch } from 'react-router-dom';
import { push } from 'react-router-redux';

import agent from '../agent';
import Article from '../components/Article';
import Editor from '../components/Editor';
import Home from '../components/Home';
import Login from '../components/Login';
import Profile from '../components/Profile';
import ProfileFavorites from '../components/ProfileFavorites';
import Register from '../components/Register';
import Settings from '../components/Settings';
import { APP_LOAD, REDIRECT } from '../constants/actionTypes';
import { store } from '../store';
import Header from './Header';
`);
      },
      errors: 1,
    },

    // https://github.com/gothinkster/react-redux-realworld-example-app/blob/b5557d1fd40afebe023e3102ad6ef50475146506/src/components/Editor.js#L1-L12
    {
      code: `
import ListErrors from './ListErrors';
import React from 'react';
import agent from '../agent';
import { connect } from 'react-redux';
import {
  ADD_TAG,
  EDITOR_PAGE_LOADED,
  REMOVE_TAG,
  ARTICLE_SUBMITTED,
  EDITOR_PAGE_UNLOADED,
  UPDATE_FIELD_EDITOR
} from '../constants/actionTypes';
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import React from 'react';
import { connect } from 'react-redux';

import agent from '../agent';
import {
  ADD_TAG,
  ARTICLE_SUBMITTED,
  EDITOR_PAGE_LOADED,
  EDITOR_PAGE_UNLOADED,
  REMOVE_TAG,
  UPDATE_FIELD_EDITOR
} from '../constants/actionTypes';
import ListErrors from './ListErrors';
`);
      },
      errors: 1,
    },
  ],
});

const flowRuleTester = new RuleTester({
  parser: "babel-eslint",
});

flowRuleTester.run("sort (flow)", plugin.rules.sort, {
  valid: [
    // Simple cases.
    `import type a from "a"`,
    `import type {a} from "a"`,
    `import type a, {b} from "a"`,
    `import type {} from "a"`,
    `import type {    } from "a"`,

    // typeof
    `import typeof a from "a"`,
    `import typeof {a} from "a"`,
    `import typeof a, {b} from "a"`,
    `import typeof {} from "a"`,
    `import typeof {    } from "a"`,

    // type specifiers.
    `import { type b, type c, a } from "a"`,

    // typeof specifiers.
    `import { typeof b, typeof c, a } from "a"`,

    // Mixed specifiers.
    `import { type c, typeof b, a } from "a"`,

    // Sorted alphabetically.
    `
import type x1 from "a";
import typeof x2 from "b"
import typeof x3 from "c";
import type x4 from "d"
    `.trim(),
  ],

  invalid: [
    // Type imports.
    {
      code: `
import react from "react"
import type {Z} from "Z";
import './global.css';
import type {X} from "X";
import {truncate, typeof T, type Y, pluralize} from "./utils"
import type B from "./B";
import type C from "/B";
import typeof A from "A";
import typeof D from "./D";
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import './global.css';

import typeof A from "A";
import type {X} from "X";
import type {Z} from "Z";
import react from "react"

import type C from "/B";

import type B from "./B";
import typeof D from "./D";
import {type Y, typeof T, pluralize,truncate} from "./utils"
`);
      },
      errors: 1,
    },

    // Original order is preserved for duplicate specifiers.
    // espree considers this a syntax error, but babel-eslint allows it.
    {
      code: `import {a as c, a as b2, a/*1*/, b, a/*2*/} from "specifiers-duplicates"`.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(
          `import {a/*1*/, a,/*2*/a as b2, a as c, b} from "specifiers-duplicates"`
        );
      },
      errors: 1,
    },

    // All at once.
    {
      code: `
import A from "webpack!a";
import B from "webpack!./a";
import type C from "a";
import D from "a";
import typeof E from "a";
import type F from "flow!./a";
import type G from "flow!a";
import typeof H from "a";
import type I from "./a";
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import type C from "a";
import type G from "flow!a";
import typeof E from "a";
import typeof H from "a";
import D from "a";
import A from "webpack!a";

import type I from "./a";
import type F from "flow!./a";
import B from "webpack!./a";
`);
      },
      errors: 1,
    },

    // https://github.com/babel/babel/blob/1af57e6f71ecffae10cb932415ac849d9cdc14e9/packages/babel-parser/test/fixtures/flow/type-imports/import-type/input.js#L1-L14
    {
      code: `
import type Def from "foo";
import type {named} from "foo";
import type Def, {named} from "foo";
import type switch from "foo";
import type { switch } from "foo";
import type { foo, bar } from "baz";
import type from "foo";
import type, { foo } from "bar";
import typeof foo from "bar";
import typeof switch from "foo";
import typeof { switch } from "foo";
import typeof { foo as bar } from "baz";
import typeof * as ns from "foo";
import typeof * as switch from "foo";
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import typeof foo from "bar";
import type, { foo } from "bar";
import type { bar,foo } from "baz";
import typeof { foo as bar } from "baz";
import type Def from "foo";
import type {named} from "foo";
import type Def, {named} from "foo";
import type switch from "foo";
import type { switch } from "foo";
import typeof switch from "foo";
import typeof { switch } from "foo";
import typeof * as ns from "foo";
import typeof * as switch from "foo";
import type from "foo";
`);
      },
      errors: 1,
    },

    // https://github.com/graphql/graphql-js/blob/64b194c6c9b9aaa1c139f1b7c3692a6ef851928e/src/execution/execute.js#L10-L69
    {
      code: `
import { forEach, isCollection } from 'iterall';
import { GraphQLError } from '../error/GraphQLError';
import { locatedError } from '../error/locatedError';
import inspect from '../jsutils/inspect';
import invariant from '../jsutils/invariant';
import isInvalid from '../jsutils/isInvalid';
import isNullish from '../jsutils/isNullish';
import isPromise from '../jsutils/isPromise';
import memoize3 from '../jsutils/memoize3';
import promiseForObject from '../jsutils/promiseForObject';
import promiseReduce from '../jsutils/promiseReduce';
import type { ObjMap } from '../jsutils/ObjMap';
import type { MaybePromise } from '../jsutils/MaybePromise';

import { getOperationRootType } from '../utilities/getOperationRootType';
import { typeFromAST } from '../utilities/typeFromAST';
import { Kind } from '../language/kinds';
import {
  getVariableValues,
  getArgumentValues,
  getDirectiveValues,
} from './values';
import {
  isObjectType,
  isAbstractType,
  isLeafType,
  isListType,
  isNonNullType,
} from '../type/definition';
import type {
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLLeafType,
  GraphQLAbstractType,
  GraphQLField,
  GraphQLFieldResolver,
  GraphQLResolveInfo,
  ResponsePath,
  GraphQLList,
} from '../type/definition';
import type { GraphQLSchema } from '../type/schema';
import {
  SchemaMetaFieldDef,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
} from '../type/introspection';
import {
  GraphQLIncludeDirective,
  GraphQLSkipDirective,
} from '../type/directives';
import { assertValidSchema } from '../type/validate';
import type {
  DocumentNode,
  OperationDefinitionNode,
  SelectionSetNode,
  FieldNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  FragmentDefinitionNode,
} from '../language/ast';
      `.trim(),
      output: actual => {
        expect(actual).toMatchInlineSnapshot(`
import { forEach, isCollection } from 'iterall';

import { GraphQLError } from '../error/GraphQLError';
import { locatedError } from '../error/locatedError';
import type { MaybePromise } from '../jsutils/MaybePromise';
import type { ObjMap } from '../jsutils/ObjMap';
import inspect from '../jsutils/inspect';
import invariant from '../jsutils/invariant';
import isInvalid from '../jsutils/isInvalid';
import isNullish from '../jsutils/isNullish';
import isPromise from '../jsutils/isPromise';
import memoize3 from '../jsutils/memoize3';
import promiseForObject from '../jsutils/promiseForObject';
import promiseReduce from '../jsutils/promiseReduce';
import type {
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  OperationDefinitionNode,
  SelectionSetNode,
} from '../language/ast';
import { Kind } from '../language/kinds';
import type {
  GraphQLAbstractType,
  GraphQLField,
  GraphQLFieldResolver,
  GraphQLLeafType,
  GraphQLList,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLResolveInfo,
  ResponsePath,
} from '../type/definition';
import {
  isAbstractType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
} from '../type/definition';
import {
  GraphQLIncludeDirective,
  GraphQLSkipDirective,
} from '../type/directives';
import {
  SchemaMetaFieldDef,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
} from '../type/introspection';
import type { GraphQLSchema } from '../type/schema';
import { assertValidSchema } from '../type/validate';
import { getOperationRootType } from '../utilities/getOperationRootType';
import { typeFromAST } from '../utilities/typeFromAST';
import {
  getArgumentValues,
  getDirectiveValues,
  getVariableValues,
} from './values';
`);
      },
      errors: 1,
    },
  ],
});
