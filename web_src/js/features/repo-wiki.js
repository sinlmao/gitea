import {initMarkupContent} from '../markup/content.js';
import {attachEasyMDEToElements, validateTextareaNonEmpty} from './comp/CommentEasyMDE.js';
import {initCompMarkupContentPreviewTab} from './comp/MarkupContentPreview.js';

const {csrfToken} = window.config;

export function initRepoWikiForm() {
  const $editArea = $('.repository.wiki textarea#edit_area');
  let sideBySideChanges = 0;
  let sideBySideTimeout = null;
  let hasEasyMDE = true;

  if ($editArea.length > 0) {
    const $form = $('.repository.wiki.new .ui.form');
    const easyMDE = new window.EasyMDE({
      autoDownloadFontAwesome: false,
      element: $editArea[0],
      forceSync: true,
      previewRender(plainText, preview) { // Async method
        // FIXME: still send render request when return back to edit mode
        const render = function () {
          sideBySideChanges = 0;
          if (sideBySideTimeout !== null) {
            clearTimeout(sideBySideTimeout);
            sideBySideTimeout = null;
          }
          $.post($editArea.data('url'), {
            _csrf: csrfToken,
            mode: 'gfm',
            context: $editArea.data('context'),
            text: plainText,
            wiki: true
          }, (data) => {
            preview.innerHTML = `<div class="markup ui segment">${data}</div>`;
            initMarkupContent();
          });
        };

        setTimeout(() => {
          if (!easyMDE.isSideBySideActive()) {
            render();
          } else {
            // delay preview by keystroke counting
            sideBySideChanges++;
            if (sideBySideChanges > 10) {
              render();
            }
            // or delay preview by timeout
            if (sideBySideTimeout !== null) {
              clearTimeout(sideBySideTimeout);
              sideBySideTimeout = null;
            }
            sideBySideTimeout = setTimeout(render, 600);
          }
        }, 0);
        if (!easyMDE.isSideBySideActive()) {
          return 'Loading...';
        }
        return preview.innerHTML;
      },
      renderingConfig: {
        singleLineBreaks: false
      },
      indentWithTabs: false,
      tabSize: 4,
      spellChecker: false,
      toolbar: ['bold', 'italic', 'strikethrough', '|',
        'heading-1', 'heading-2', 'heading-3', 'heading-bigger', 'heading-smaller', '|',
        {
          name: 'code-inline',
          action(e) {
            const cm = e.codemirror;
            const selection = cm.getSelection();
            cm.replaceSelection(`\`${selection}\``);
            if (!selection) {
              const cursorPos = cm.getCursor();
              cm.setCursor(cursorPos.line, cursorPos.ch - 1);
            }
            cm.focus();
          },
          className: 'fa fa-angle-right',
          title: 'Add Inline Code',
        }, 'code', 'quote', '|', {
          name: 'checkbox-empty',
          action(e) {
            const cm = e.codemirror;
            cm.replaceSelection(`\n- [ ] ${cm.getSelection()}`);
            cm.focus();
          },
          className: 'fa fa-square-o',
          title: 'Add Checkbox (empty)',
        },
        {
          name: 'checkbox-checked',
          action(e) {
            const cm = e.codemirror;
            cm.replaceSelection(`\n- [x] ${cm.getSelection()}`);
            cm.focus();
          },
          className: 'fa fa-check-square-o',
          title: 'Add Checkbox (checked)',
        }, '|',
        'unordered-list', 'ordered-list', '|',
        'link', 'image', 'table', 'horizontal-rule', '|',
        'clean-block', 'preview', 'fullscreen', 'side-by-side', '|',
        {
          name: 'revert-to-textarea',
          action(e) {
            e.toTextArea();
            hasEasyMDE = false;
            const $root = $form.find('.field.content');
            const loading = $root.data('loading');
            $root.append(`<div class="ui bottom tab markup" data-tab="preview">${loading}</div>`);
            initCompMarkupContentPreviewTab($form);
          },
          className: 'fa fa-file',
          title: 'Revert to simple textarea',
        },
      ]
    });

    attachEasyMDEToElements(easyMDE);

    const $mdeInputField = $(easyMDE.codemirror.getInputField());
    $mdeInputField.addClass('js-quick-submit');

    $form.on('submit', () => {
      if (!validateTextareaNonEmpty($editArea)) {
        return false;
      }
    });

    setTimeout(() => {
      const $bEdit = $('.repository.wiki.new .previewtabs a[data-tab="write"]');
      const $bPrev = $('.repository.wiki.new .previewtabs a[data-tab="preview"]');
      const $toolbar = $('.editor-toolbar');
      const $bPreview = $('.editor-toolbar button.preview');
      const $bSideBySide = $('.editor-toolbar a.fa-columns');
      $bEdit.on('click', (e) => {
        if (!hasEasyMDE) {
          return false;
        }
        e.stopImmediatePropagation();
        if ($toolbar.hasClass('disabled-for-preview')) {
          $bPreview.trigger('click');
        }

        return false;
      });
      $bPrev.on('click', (e) => {
        if (!hasEasyMDE) {
          return false;
        }
        e.stopImmediatePropagation();
        if (!$toolbar.hasClass('disabled-for-preview')) {
          $bPreview.trigger('click');
        }
        return false;
      });
      $bPreview.on('click', () => {
        setTimeout(() => {
          if ($toolbar.hasClass('disabled-for-preview')) {
            if ($bEdit.hasClass('active')) {
              $bEdit.removeClass('active');
            }
            if (!$bPrev.hasClass('active')) {
              $bPrev.addClass('active');
            }
          } else {
            if (!$bEdit.hasClass('active')) {
              $bEdit.addClass('active');
            }
            if ($bPrev.hasClass('active')) {
              $bPrev.removeClass('active');
            }
          }
        }, 0);

        return false;
      });
      $bSideBySide.on('click', () => {
        sideBySideChanges = 10;
      });
    }, 0);
  }
}
