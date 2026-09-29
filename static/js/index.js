document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('video').forEach(function(video) {
    video.defaultPlaybackRate = 1.0;
    video.playbackRate = 1.0;

  });

  var projectNavLinks = Array.from(document.querySelectorAll('.project-nav a[href^="#"]'));
  var projectNav = document.querySelector('.project-nav');
  var projectNavToggle = document.querySelector('.project-nav-toggle');
  var projectNavToggleLabel = document.querySelector('.project-nav-toggle-label');
  var projectSections = projectNavLinks.reduce(function(sections, link) {
    var targetIds = [link.getAttribute('href').slice(1)].concat(
      (link.dataset.relatedTargets || '').split(/\s+/).filter(Boolean)
    );

    targetIds.forEach(function(targetId) {
      var section = document.getElementById(targetId);

      if (section && sections.indexOf(section) === -1) {
        sections.push(section);
      }
    });

    return sections;
  }, []);
  var navUpdateFrame = null;

  function setProjectNavOpen(isOpen) {
    if (!projectNav || !projectNavToggle) {
      return;
    }

    projectNav.classList.toggle('is-open', isOpen);
    projectNavToggle.setAttribute('aria-expanded', String(isOpen));
  }

  function updateProjectNav() {
    var checkpoint = window.scrollY + 120;
    var activeSection = projectSections.find(function(section) {
      return section.offsetParent !== null;
    }) || null;

    projectSections.forEach(function(section) {
      if (section.offsetParent !== null && section.getBoundingClientRect().top + window.scrollY <= checkpoint) {
        activeSection = section;
      }
    });

    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      activeSection = projectSections.filter(function(section) {
        return section.offsetParent !== null;
      }).pop() || activeSection;
    }

    projectNavLinks.forEach(function(link) {
      var relatedTargets = (link.dataset.relatedTargets || '').split(/\s+/).filter(Boolean);
      var isActive = activeSection && (
        link.getAttribute('href') === '#' + activeSection.id ||
        relatedTargets.indexOf(activeSection.id) !== -1
      );
      link.classList.toggle('is-active', Boolean(isActive));

      if (isActive) {
        link.setAttribute('aria-current', 'location');
        if (projectNavToggleLabel) {
          projectNavToggleLabel.textContent = link.textContent.trim();
        }
      } else {
        link.removeAttribute('aria-current');
      }
    });

    navUpdateFrame = null;
  }

  if (projectNavLinks.length && projectSections.length) {
    window.addEventListener('scroll', function() {
      if (navUpdateFrame === null) {
        navUpdateFrame = requestAnimationFrame(updateProjectNav);
      }
    }, { passive: true });

    updateProjectNav();
  }

  if (projectNavToggle) {
    projectNavToggle.addEventListener('click', function() {
      var isOpen = projectNavToggle.getAttribute('aria-expanded') === 'true';
      setProjectNavOpen(!isOpen);
    });

    projectNavLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        var targetId = link.getAttribute('href').slice(1);
        var adaptationTab = document.querySelector('#adaptation-object-switcher > .task-tabs [data-task-target="' + targetId + '"]');

        if (adaptationTab) {
          adaptationTab.click();
        }

        setProjectNavOpen(false);
      });
    });

    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        setProjectNavOpen(false);
      }
    });
  }

  document.querySelectorAll('[data-intervention-highlight], [data-failure-highlight], [data-success-highlight]').forEach(function(highlight) {
    var video = highlight.querySelector('video');
    var isFailure = highlight.hasAttribute('data-failure-highlight');
    var isSuccess = highlight.hasAttribute('data-success-highlight');
    var successFromEnd = isSuccess && !highlight.hasAttribute('data-success-start');
    var successWindow = Number(highlight.dataset.successWindow);
    var highlightStart = isSuccess
      ? (successFromEnd ? 0 : Number(highlight.dataset.successStart))
      : Number(isFailure ? highlight.dataset.failureStart : highlight.dataset.interventionStart);
    var highlightEnd = isFailure || isSuccess ? Infinity : Number(highlight.dataset.interventionEnd);
    var stateClass = isSuccess ? 'is-successful' : (isFailure ? 'is-failed' : 'is-intervening');
    var animationFrame = null;

    if (!video || !Number.isFinite(highlightStart) ||
        (!isFailure && !isSuccess && !Number.isFinite(highlightEnd)) ||
        (successFromEnd && (!Number.isFinite(successWindow) || successWindow <= 0))) {
      return;
    }

    function updateHighlightState() {
      var start = successFromEnd ? Math.max(0, video.duration - successWindow) : highlightStart;
      var isActive = Number.isFinite(start) && (!isSuccess || video.duration > 0) &&
        video.currentTime >= start && video.currentTime <= highlightEnd;
      highlight.classList.toggle(stateClass, isActive);
    }

    function stopTracking() {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    }

    function trackHighlight() {
      updateHighlightState();

      if (!video.paused && !video.ended) {
        animationFrame = requestAnimationFrame(trackHighlight);
      } else {
        animationFrame = null;
      }
    }

    function startTracking() {
      stopTracking();
      trackHighlight();
    }

    video.addEventListener('play', startTracking);
    video.addEventListener('pause', function() {
      stopTracking();
      updateHighlightState();
    });
    video.addEventListener('timeupdate', updateHighlightState);
    video.addEventListener('seeked', updateHighlightState);
    video.addEventListener('loadedmetadata', updateHighlightState);
    video.addEventListener('durationchange', updateHighlightState);
    video.addEventListener('ended', function() {
      stopTracking();
      updateHighlightState();
    });

    updateHighlightState();
  });

  document.querySelectorAll('.rotation-target-overlay').forEach(function(overlay) {
    var videoContainer = overlay.closest('.result-video');
    var video = videoContainer ? videoContainer.querySelector(':scope > video') : null;
    var coordinateFrame = overlay.querySelector('.rotation-coordinate-moving');
    var previousTime = 0;

    if (!video || !coordinateFrame) {
      return;
    }

    function setPausedState() {
      coordinateFrame.classList.toggle('is-video-sync-paused', video.paused);
    }

    function restartCoordinateAnimation() {
      coordinateFrame.classList.remove('is-video-sync-active');
      void coordinateFrame.offsetWidth;
      coordinateFrame.classList.add('is-video-sync-active');
      setPausedState();
    }

    video.addEventListener('play', function() {
      if (video.currentTime < 0.25) {
        restartCoordinateAnimation();
      }
      coordinateFrame.classList.remove('is-video-sync-paused');
      previousTime = video.currentTime;
    });

    video.addEventListener('pause', setPausedState);

    video.addEventListener('timeupdate', function() {
      if (video.currentTime + 0.25 < previousTime) {
        restartCoordinateAnimation();
      }
      previousTime = video.currentTime;
    });

    video.addEventListener('seeked', function() {
      if (video.currentTime < 0.25 || video.currentTime + 0.25 < previousTime) {
        restartCoordinateAnimation();
      }
      previousTime = video.currentTime;
    });

    previousTime = video.currentTime;
    restartCoordinateAnimation();
  });

  document.querySelectorAll('[data-video-highlight]').forEach(function(highlight) {
    var mainVideo = highlight.querySelector(':scope > video');
    var detailVideo = highlight.querySelector('.contact-detail-inset video');
    var detailInset = detailVideo ? detailVideo.closest('.contact-detail-inset') : null;
    var pipToggle = highlight.querySelector('[data-pip-toggle]');

    if (!mainVideo || !detailVideo) {
      return;
    }

    function syncDetailTime() {
      if (!isDetailVisible()) return;
      if (Math.abs(detailVideo.currentTime - mainVideo.currentTime) > 0.12) {
        detailVideo.currentTime = mainVideo.currentTime;
      }
    }

    function isDetailVisible() {
      return !detailInset || (!detailInset.hidden && detailInset.getClientRects().length > 0);
    }

    mainVideo.addEventListener('play', function() {
      syncDetailTime();
      detailVideo.playbackRate = mainVideo.playbackRate;

      if (isDetailVisible()) {
        detailVideo.play().catch(function() {});
      } else {
        detailVideo.pause();
      }
    });

    mainVideo.addEventListener('pause', function() {
      detailVideo.pause();
    });

    mainVideo.addEventListener('seeking', syncDetailTime);
    mainVideo.addEventListener('timeupdate', syncDetailTime);
    mainVideo.addEventListener('ratechange', function() {
      detailVideo.playbackRate = mainVideo.playbackRate;
    });

    if (pipToggle && detailInset) {
      pipToggle.addEventListener('click', function() {
        var isOpen = detailInset.hidden;
        detailInset.hidden = !isOpen;
        pipToggle.classList.toggle('is-active', isOpen);
        pipToggle.setAttribute('aria-expanded', String(isOpen));
        pipToggle.textContent = isOpen ? 'Hide Close-up' : 'Close-up';

        if (isOpen) {
          syncDetailTime();
          detailVideo.playbackRate = mainVideo.playbackRate;

          if (!mainVideo.paused) {
            detailVideo.play().catch(function() {});
          }
        } else {
          detailVideo.pause();
        }
      });
    }

    if (mainVideo.paused) {
      detailVideo.pause();
    } else {
      syncDetailTime();
    }
  });

  document.querySelectorAll('[data-video-carousel]').forEach(function(carousel) {
    var slides = Array.from(carousel.querySelectorAll('[data-carousel-slide]'));
    var pageButtons = Array.from(carousel.querySelectorAll('[data-carousel-page]'));
    var stepButtons = Array.from(carousel.querySelectorAll('[data-carousel-step]'));
    var counter = carousel.querySelector('[data-carousel-counter]');
    var activeIndex = 0;
    var touchStartX = 0;
    var touchStartY = 0;

    function showSlide(nextIndex, restartVideo) {
      activeIndex = (nextIndex + slides.length) % slides.length;

      slides.forEach(function(slide, index) {
        var isActive = index === activeIndex;
        slide.hidden = !isActive;

        slide.querySelectorAll('video').forEach(function(video) {
          if (!isActive) {
            video.pause();
            return;
          }

          if (restartVideo) {
            try {
              video.currentTime = 0;
            } catch (error) {}
          }

          if (!carousel.closest('[hidden]')) {
            video.play().catch(function() {});
          }
        });
      });

      pageButtons.forEach(function(button, index) {
        var isActive = index === activeIndex;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });

      if (counter) {
        counter.textContent = (activeIndex + 1) + ' / ' + slides.length;
        counter.setAttribute('aria-label', 'Rollout ' + (activeIndex + 1) + ' of ' + slides.length);
      }
    }

    pageButtons.forEach(function(button) {
      button.addEventListener('click', function() {
        showSlide(Number(button.dataset.carouselPage), true);
      });
    });

    stepButtons.forEach(function(button) {
      button.addEventListener('click', function() {
        showSlide(activeIndex + Number(button.dataset.carouselStep), true);
      });
    });

    carousel.addEventListener('touchstart', function(event) {
      var touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });

    carousel.addEventListener('touchend', function(event) {
      var touch = event.changedTouches[0];
      var deltaX = touch.clientX - touchStartX;
      var deltaY = touch.clientY - touchStartY;

      if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) {
        return;
      }

      showSlide(activeIndex + (deltaX < 0 ? 1 : -1), true);
    }, { passive: true });

    showSlide(0, false);
  });

  document.querySelectorAll('[data-task-switcher]').forEach(function(switcher) {
    var tabs = Array.from(switcher.querySelectorAll('.task-tab')).filter(function(tab) {
      return tab.closest('[data-task-switcher]') === switcher;
    });
    var panels = Array.from(switcher.querySelectorAll('.task-panel')).filter(function(panel) {
      return panel.closest('[data-task-switcher]') === switcher;
    });

    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        var targetId = tab.dataset.taskTarget;

        tabs.forEach(function(candidate) {
          var isActive = candidate === tab;
          candidate.classList.toggle('is-dark', isActive);
          candidate.setAttribute('aria-selected', String(isActive));

          if (switcher.id === 'adaptation-object-switcher') {
            candidate.tabIndex = isActive ? 0 : -1;
          }
        });

        panels.forEach(function(panel) {
          var isActive = panel.id === targetId;
          panel.hidden = !isActive;

          panel.querySelectorAll('video').forEach(function(video) {
            if (!isActive) {
              video.pause();
            }
          });
        });

        updateProjectNav();
      });
    });

    if (switcher.id === 'adaptation-object-switcher') {
      tabs.forEach(function(tab, index) {
        tab.addEventListener('keydown', function(event) {
          var nextIndex;

          switch (event.key) {
            case 'ArrowRight':
              nextIndex = (index + 1) % tabs.length;
              break;
            case 'ArrowLeft':
              nextIndex = (index - 1 + tabs.length) % tabs.length;
              break;
            case 'Home':
              nextIndex = 0;
              break;
            case 'End':
              nextIndex = tabs.length - 1;
              break;
            default:
              return;
          }

          event.preventDefault();
          tabs[nextIndex].click();
          tabs[nextIndex].focus();
        });
      });

      function showLinkedAdaptation() {
        var linkedTab = tabs.find(function(tab) {
          return '#' + tab.dataset.taskTarget === window.location.hash;
        });

        if (linkedTab) {
          linkedTab.click();
          requestAnimationFrame(function() {
            switcher.scrollIntoView({ block: 'start', behavior: 'instant' });
          });
        }
      }

      window.addEventListener('hashchange', showLinkedAdaptation);
      showLinkedAdaptation();
    }
  });

  var animatedFlow = document.querySelector('.redex-flow');
  if (animatedFlow) {
    var flowVisible = false;
    function updateFlowPlayback() {
      animatedFlow.classList.toggle('is-running', flowVisible && !document.hidden);
    }
    var flowObserver = new IntersectionObserver(function(entries) {
      flowVisible = entries[0].isIntersecting;
      updateFlowPlayback();
    }, { threshold: 0 });
    flowObserver.observe(animatedFlow);
    document.addEventListener('visibilitychange', updateFlowPlayback);
  }

  // Play experiments in place as they enter the viewport.
  var inlineVideos = Array.from(document.querySelectorAll('.page-content video')).filter(function(video) {
    return !video.closest('.contact-detail-inset') && !video.hasAttribute('data-manual-playback');
  });
  var visibleVideos = new Set();

  function playInline(video) {
    if (!document.hidden && visibleVideos.has(video)) {
      video.play().catch(function() {});
    }
  }

  inlineVideos.forEach(function(video) {
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.controls = video.hasAttribute('data-video-controls');
  });

  var playbackObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      var video = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.15) {
        visibleVideos.add(video);
        playInline(video);
      } else {
        visibleVideos.delete(video);
        video.pause();
      }
    });
  }, { threshold: [0, 0.15] });

  inlineVideos.forEach(function(video) { playbackObserver.observe(video); });

  document.addEventListener('visibilitychange', function() {
    inlineVideos.forEach(function(video) {
      if (document.hidden) video.pause();
      else playInline(video);
    });
  });
});
