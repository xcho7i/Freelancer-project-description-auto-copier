(function () {
  const alreadyCopiedKey = '__freelancerProjectCopied';

  function cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getTextFromElements(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = cleanText(element.innerText || element.textContent || '');
        if (text.length > 20) {
          return text;
        }
      }
    }
    return '';
  }

  function getSectionTextByLabel(labelRegex) {
    const headingSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'strong', 'span'];
    for (const selector of headingSelectors) {
      const headings = Array.from(document.querySelectorAll(selector));
      for (const heading of headings) {
        const headingText = cleanText(heading.innerText || heading.textContent || '');
        if (labelRegex.test(headingText)) {
          const candidates = [];
          if (heading.nextElementSibling) candidates.push(heading.nextElementSibling);
          if (heading.parentElement && heading.parentElement !== heading) candidates.push(heading.parentElement);
          for (const node of candidates) {
            const text = cleanText(node.innerText || node.textContent || '');
            if (text.length > 20 && !labelRegex.test(text)) {
              return text;
            }
          }
        }
      }
    }
    return '';
  }

  function getDescription() {
    const descriptionSelectors = [
      'app-project-details-description .ProjectDescription',
      '.ProjectDescription',
      '.ProjectDescription .ContentWrapper',
      '.ProjectDescription .Content',
      '[data-testid="project-description"]',
      '[data-test="project-description"]',
      '.ProjectDescription-description',
      '.project-description',
      '.JobDetail-description',
      '.job-description',
      '#project-description',
      'section#description',
      '.Description',
      '[data-testid="job-description"]'
    ];

    let description = getTextFromElements(descriptionSelectors);
    if (description) {
      return description;
    }

    description = getSectionTextByLabel(/description/i);
    return description;
  }

  function getSkills() {
    const skillSelectors = [
      'app-project-details-skills .ProjectViewDetailsSkills',
      '.ProjectViewDetailsSkills',
      '.ProjectSkills',
      '.job-skills',
      '.skills .SkillTag',
      '.skill-tags',
      '.js-skill-tags',
      '.skills-list',
      '.tags',
      '.SkillList',
      '.SkillTagsList'
    ];

    for (const selector of skillSelectors) {
      const container = document.querySelector(selector);
      if (!container) continue;
      const skillItems = Array.from(container.querySelectorAll('.Content, .Tag, .LinkElement, a'))
        .map(el => cleanText(el.innerText || el.textContent || ''))
        .filter(text => text.length > 1);
      const uniqueSkills = [...new Set(skillItems)];
      if (uniqueSkills.length) {
        return uniqueSkills.join(', ');
      }
    }

    const skillsSection = getSectionByLabel(/skills|required skills|expertise/i);
    if (skillsSection) {
      return skillsSection.join(', ');
    }

    return '';
  }

  function getSectionByLabel(labelRegex) {
    const headingSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'strong'];
    for (const selector of headingSelectors) {
      const headings = Array.from(document.querySelectorAll(selector));
      for (const heading of headings) {
        const headingText = cleanText(heading.innerText || heading.textContent || '');
        if (labelRegex.test(headingText)) {
          const section = heading.closest('section') || heading.parentElement;
          if (section) {
            const items = Array.from(section.querySelectorAll('li, button, a, span'))
              .map(el => cleanText(el.innerText || el.textContent || ''))
              .filter(text => text.length > 1 && !labelRegex.test(text));
            return [...new Set(items)];
          }
        }
      }
    }
    return [];
  }

  function copyToClipboard(text) {
    if (!text) {
      return false;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
      return true;
    }

    return fallbackCopy(text);
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (error) {
      console.error('Fallback copy failed', error);
    }

    document.body.removeChild(textarea);
    return success;
  }

  function buildClipboardValue(description, skills) {
    const parts = [];
    if (description) {
      parts.push('Project description:');
      parts.push(description);
    }
    if (skills) {
      parts.push('Required skills:');
      parts.push(skills);
    }
    return parts.join('\n\n');
  }

  function tryCopyForCurrentProject() {
    if (window[alreadyCopiedKey]) {
      return;
    }

    const description = getDescription();
    const skills = getSkills();
    if (!description && !skills) {
      return;
    }

    const clipboardText = buildClipboardValue(description, skills);
    const copied = copyToClipboard(clipboardText);
    if (copied) {
      window[alreadyCopiedKey] = true;
      console.log('Freelancer project data copied to clipboard.');
    }
  }

  function observeDOM() {
    const observer = new MutationObserver(() => {
      tryCopyForCurrentProject();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function onPageUpdate() {
    window[alreadyCopiedKey] = false;
    tryCopyForCurrentProject();
  }

  function patchHistoryEvents() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function () {
      const result = originalPushState.apply(this, arguments);
      window.dispatchEvent(new Event('locationchange'));
      return result;
    };

    history.replaceState = function () {
      const result = originalReplaceState.apply(this, arguments);
      window.dispatchEvent(new Event('locationchange'));
      return result;
    };

    window.addEventListener('popstate', () => window.dispatchEvent(new Event('locationchange')));
  }

  function init() {
    tryCopyForCurrentProject();
    observeDOM();
    patchHistoryEvents();
    window.addEventListener('locationchange', onPageUpdate);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    window.addEventListener('DOMContentLoaded', init);
  }
})();
