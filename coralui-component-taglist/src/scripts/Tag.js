/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2017 Adobe Systems Incorporated
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */

import Component from 'coralui-mixin-component';
import 'coralui-component-button';
import base from '../templates/base';
import {transform, validate, events} from 'coralui-util';

const CLASSNAME = 'coral3-Tag';

/**
 Enum for tag size values.
 
 @enum {String}
 @memberof Coral.Tag
 */
const size = {
  /** A default tag (non-interactive), height 20px without closable button. */
  SMALL: 'S',
  /** A default tag (non-interactive), height 28px without closable button. */
  MEDIUM: 'M',
  /** A default tag (interactive), height 32px without closable button. */
  LARGE: 'L'
};

/**
 Color of the tag. By default they are semi-transparent unless otherwise stated.
 
 @enum {String}
 @memberof Coral.Tag
 */
const color = {
  DEFAULT: '',
  GREY: 'grey',
  BLUE: 'blue',
  LIGHT_BLUE: 'lightblue',
  PERIWINKLE: 'periwinkle',
  PLUM: 'plum',
  FUCHSIA: 'fuchsia',
  MAGENTA: 'magenta',
  RED: 'red',
  ORANGE: 'orange',
  TANGERINE: 'tangerine',
  YELLOW: 'yellow',
  CHARTREUSE: 'chartreuse',
  GREEN: 'green',
  KELLY_GREEN: 'kellygreen',
  SEA_FOAM: 'seafoam',
  CYAN: 'cyan'
};

// size mappings
const SIZE_CLASSES = {
  'S': 'small',
  'M': 'medium',
  'L': 'large'
};

// builds a string containing all possible size classnames. this will be used to remove classnames when the size
// changes
const ALL_SIZE_CLASSES = [];
for (const sizeValue in size) {
  ALL_SIZE_CLASSES.push(`${CLASSNAME}--${SIZE_CLASSES[size[sizeValue]]}`);
}

// builds a string containing all possible color classnames. this will be used to remove classnames when the color
// changes
const ALL_COLOR_CLASSES = [];
for (const colorValue in color) {
  ALL_COLOR_CLASSES.push(`${CLASSNAME}--${color[colorValue]}`);
}

const QUIET_CLASSNAME = `${CLASSNAME}--quiet`;
const MULTILINE_CLASSNAME = `${CLASSNAME}--multiline`;

// Store coordinates of a mouse down event to compare against mouseup coordinates.
let bullsEye = null;

// Utility method to detect center point of an element.
const getOffsetCenter = function(element) {
  const rect = element.getBoundingClientRect();
  const body = document.body;
  const documentElement = document.documentElement;
  const scrollTop = window.pageYOffset || documentElement.scrollTop || body.scrollTop;
  const scrollLeft = window.pageXOffset || documentElement.scrollLeft || body.scrollLeft;
  const clientTop = documentElement.clientTop || body.clientTop || 0;
  const clientLeft = documentElement.clientLeft || body.clientLeft || 0;
  const x = rect.left + rect.width / 2 + scrollLeft - clientLeft;
  const y = rect.top + rect.height / 2 + scrollTop - clientTop;
  return {
    x: Math.round(x),
    y: Math.round(y)
  };
};

/**
 @class Coral.Tag
 @classdesc A Tag component
 @htmltag coral-tag
 @extends HTMLElement
 @extends Coral.mixin.component
 */
class Tag extends Component(HTMLElement) {
  constructor() {
    super();
    
    // Attach events
    this._delegateEvents({
      'click': '_onClick',
      'key:backspace': '_onRemoveButtonClick',
      'key:delete': '_onRemoveButtonClick',
      'key:space': '_onRemoveButtonClick',
      'mousedown': '_onMouseDown'
    });
    
    // Prepare templates
    this._elements = {
      // Create or fetch the label element.
      label: this.querySelector('coral-tag-label') || document.createElement('coral-tag-label')
    };
    base.call(this._elements);
  }
  
  /**
   The tag's label element.
   
   @type {HTMLElement}
   @contentzone
   @memberof Coral.Tag#
   */
  get label() {
    return this._getContentZone(this._elements.label);
  }
  set label(value) {
    this._setContentZone('label', value, {
      handle: 'label',
      tagName: 'coral-tag-label',
      insert: function(label) {
        this.appendChild(label);
        this._updateAriaLabel();
      }
    });
  }
  
  /**
   Whether this component can be closed.
   
   @type {Boolean}
   @default false
   @htmlattribute closable
   @htmlattributereflected
   @memberof Coral.Tag#
   */
  get closable() {
    return this._closable || false;
  }
  set closable(value) {
    this._closable = transform.booleanAttr(value);
    this._reflectAttribute('closable', this._closable);
  
    // Insert the button if it was not added to the DOM
    if (this.closable && !this.contains(this._elements.button)) {
      this.insertBefore(this._elements.button, this.firstChild);
    }
    this._elements.button.hidden = !this.closable;
    this._updateAriaLabel();
  }
  
  /**
   Value of the tag. If not explicitly set, the value of <code>Node.textContent</code> is returned.
   
   @type {String}
   @default ""
   @htmlattribute value
   @htmlattributereflected
   @memberof Coral.Tag#
   */
  get value() {
    return typeof this._value === 'string' ? this._value : this.textContent.replace(/\s{2,}/g, ' ').trim();
  }
  set value(value) {
    this._value = transform.string(value);
    this._reflectAttribute('value', this._value);
    
    this.trigger('coral-tag:_valuechanged');
  }
  
  /**
   A quiet tag to differentiate it from default tag.
   
   @type {Boolean}
   @default false
   @htmlattribute quiet
   @htmlattributereflected
   @memberof Coral.Tag#
   */
  get quiet() {
    return this._quiet || false;
  }
  set quiet(value) {
    this._quiet = transform.booleanAttr(value);
    this._reflectAttribute('quiet', this._quiet);
  
    this.classList.toggle(QUIET_CLASSNAME, this._quiet);
  }
  
  /**
   A multiline tag for block-level layout with multiline text.
   
   @type {Boolean}
   @default false
   @htmlattribute multiline
   @htmlattributereflected
   @memberof Coral.Tag#
   */
  get multiline() {
    return this._multiline || false;
  }
  set multiline(value) {
    this._multiline = transform.booleanAttr(value);
    this._reflectAttribute('multiline', this._multiline);
  
    this.classList.toggle(MULTILINE_CLASSNAME, this._multiline);
  }
  
  /**
   The tag's size.
   
   @type {Coral.Tag.size}
   @default Coral.Tag.size.LARGE
   @htmlattribute size
   @htmlattributereflected
   @memberof Coral.Tag#
   */
  get size() {
    return this._size || size.LARGE;
  }
  set size(value) {
    value = transform.string(value).toUpperCase();
    this._size = validate.enumeration(size)(value) && value || size.LARGE;
    this._reflectAttribute('size', this._size);
  
    this.classList.remove.apply(this.classList, ALL_SIZE_CLASSES);
    this.classList.add(`${CLASSNAME}--${SIZE_CLASSES[this._size]}`);
  }
  
  /**
   The tags's color.
   
   @type {Coral.Tag.color}
   @default Coral.Tag.color.DEFAULT
   @htmlattribute color
   @memberof Coral.Tag#
   */
  get color() {
    return this._color || color.DEFAULT;
  }
  set color(value) {
    value = transform.string(value).toLowerCase();
    this._color = validate.enumeration(color)(value) && value || color.DEFAULT;
    this._reflectAttribute('color', this._color);
  
    // removes every existing color
    this.classList.remove.apply(this.classList, ALL_COLOR_CLASSES);

    if (this.color !== Coral.Tag.color.DEFAULT) {
      this.classList.add(`${CLASSNAME}--${this._color}`);
    }
  }
  
  /** @private */
  _onRemoveButtonClick(event) {
    event.preventDefault();
    if (this.closable) {
      event.stopPropagation();
      this.focus();
      
      const host = this._host;
      this.remove();
  
      if (host) {
        host._onTagButtonClicked();
      }
    }
  }
  
  /** @private */
  _onClick(event) {
    if (this._elements.button.disabled) {
      return;
    }
    
    // If the click event originated from a screen reader's event sequence or the remove button, trigger the removal
    // of the tag.
    if (event.target === this._elements.button ||
      this._elements.button.contains(event.target) ||
      bullsEye !== null ||
      /* Detects virtual cursor or Narrator on Windows */
      (event.clientX <= 0 && event.clientY <= 0)) {
      this._onRemoveButtonClick(event);
      bullsEye = null;
    }
  }
  
  /** @private */
  _onMouseDown(event) {
    // Determine the center point of the event target
    const offsetCenter = getOffsetCenter(event.target);
    // This Tag will be the event.target when mousedown originates from a screen reader.
    if (event.target === this &&
      Math.abs(event.pageX - offsetCenter.x) < 2 &&
      Math.abs(event.pageY - offsetCenter.y) < 2) {
      // If click is close enough to the center, store the coordinates.
      bullsEye = {
        x: event.pageX,
        y: event.pageY
      };
    }
    else {
      bullsEye = null;
    }
    events.on('mouseup', this._onMouseUp);
  }
  
  /** @private */
  _onMouseUp(event) {
    // If stored bullseye coordinates don't match mouse up event coordinates,
    // don't store them any more.
    if (bullsEye !== null && (event.pageX !== bullsEye.x || event.pageY !== bullsEye.y)) {
      bullsEye = null;
    }
    events.off('mouseup', this._onMouseUp);
  }
  
  /**
   Updates the aria-label property from the button and label elements.
   
   @memberof Coral.Tag#
   @ignore
   */
  _updateAriaLabel() {
    const button = this._elements.button;
    const label = this._elements.label;
  
    // In the edge case that this is a Tag without a TagList,
    // just treat the Tag as a container element without special labelling.
    if (this.getAttribute('role') !== 'option') {
      button.removeAttribute('aria-hidden');
      label.removeAttribute('aria-hidden');
      return;
    }
  
    const labelText = [];
  
    const buttonAriaLabel = button.getAttribute('title');
    const labelTextContent = label.textContent;
  
    if (button.parentElement) {
      if (!label.parentElement || labelTextContent !== buttonAriaLabel) {
        if (!button.hidden) {
          labelText.push(buttonAriaLabel);
        }
        button.setAttribute('aria-hidden', 'true');
      }
    }
  
    if (label.parentElement) {
      if (!button.parentElement || buttonAriaLabel !== labelTextContent) {
        labelText.push(labelTextContent);
        label.setAttribute('aria-hidden', 'true');
      }
    }
  
    if (labelText.length) {
      this.setAttribute('aria-label', labelText.join(' '));
    }
    else {
      this.removeAttribute('aria-label');
    }
  }
  
  // For backwards compatibility + Torq
  get defaultContentZone() {return this.label;}
  set defaultContentZone(value) {this.label = value;}
  get _contentZones() {return {'coral-tag-label': 'label'};}
  
  // expose enumerations
  static get size() {return size;}
  static get color() {return color;}
  
  static get observedAttributes() {
    return [
      'closable',
      'value',
      'quiet',
      'multiline',
      'size',
      'color',
      'disabled'
    ];
  }
  
  attributeChangedCallback(name, oldValue, value) {
    // This is required by TagList but we don't need to expose disabled publicly as API
    if (name === 'disabled') {
      this._elements.button.disabled = true;
    }
    else {
      super.attributeChangedCallback(name, oldValue, value);
    }
  }
  
  connectedCallback() {
    super.connectedCallback();
    
    this.classList.add(CLASSNAME);
  
    // Default reflected attributes
    if (!this._size) {this.size = size.LARGE;}
    if (!this._color) {this.color = color.DEFAULT;}
  
    // Create a temporary fragment
    const fragment = document.createDocumentFragment();
  
    const templateHandleNames = ['input', 'button'];
    
    const label = this._elements.label;
  
    // Remove it so we can process children
    if (label.parentNode) {
      this.removeChild(label);
    }
  
    // Process remaining elements as necessary
    while (this.firstChild) {
      const child = this.firstChild;
      if (child.nodeType === Node.TEXT_NODE ||
        templateHandleNames.indexOf(child.getAttribute('handle')) === -1) {
        // Add non-template elements to the label
        label.appendChild(child);
      }
      else {
        // Remove anything else
        this.removeChild(child);
      }
    }
  
    // Add the frag to the component
    this.appendChild(fragment);
  
    // Assign the content zones, moving them into place in the process
    this.label = label;
    
    // Used to inform the tag list that it's added
    this.trigger('coral-tag:_connected');
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Used to inform the tag list that it's removed synchronously
    if (this._host) {
      this._host._onItemDisconnected(this);
    }
  }
  
  /**
   Triggered when the value is changed.
   
   @event Coral.Tag#coral-tag:_valuechanged
   
   @param {Object} event Event object
   @private
   */
  
  /**
   Triggered when the tag is added to the document.
   
   @event Coral.Tag#coral-tag:_connected
   
   @param {Object} event Event object
   @private
   */
}

export default Tag;
