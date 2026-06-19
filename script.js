/**
 * Culture Archiver - script.js
 * Core frontend logic: state management, local storage sync, 
 * star rating interactions, validation, edit toggles, and modal control.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // 1. State Management & Configurations
  // ==========================================================================
  let currentCategory = 'book'; // Default category: 'book', 'movie', 'drama'
  let records = [];
  let currentRating = 0.0; // Interactive star input rating (Creation form)
  let editRating = 0.0;    // Interactive star input rating (Edit modal)
  let selectedRecordId = null; // Currently viewed record in detail modal
  let isEditingMode = false;   // Modal edit state flag

  // LocalStorage Key
  const STORAGE_KEY = 'private_culture_records';

  // Fallback Cover Categories Config
  const CATEGORY_CONFIG = {
    book: { label: '책', icon: '📚', theme: 'book-theme' },
    movie: { label: '영화', icon: '🎬', theme: 'movie-theme' },
    drama: { label: '드라마', icon: '📺', theme: 'drama-theme' }
  };

  // DOM Elements - Tabs & Main Forms
  const tabButtons = {
    book: document.getElementById('tab-book'),
    movie: document.getElementById('tab-movie'),
    drama: document.getElementById('tab-drama')
  };

  const formCategoryBadge = document.getElementById('form-category-badge');
  const recordForm = document.getElementById('record-form');
  const titleInput = document.getElementById('title-input');
  const titleError = document.getElementById('title-error');
  const imageInput = document.getElementById('image-input');
  const reviewInput = document.getElementById('review-input');
  
  const starRatingInput = document.getElementById('star-rating-input');
  const starInputSvgs = starRatingInput.querySelectorAll('.star-star');
  const ratingValueDisplay = document.getElementById('rating-value-display');

  const emptyStateView = document.getElementById('empty-state-view');
  const cardsGridView = document.getElementById('cards-grid-view');

  // DOM Elements - Modal Details & Edits
  const detailModal = document.getElementById('detail-modal');
  const modalContent = detailModal.querySelector('.modal-content');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalPoster = document.getElementById('modal-poster');
  const modalCategoryBadge = document.getElementById('modal-category-badge');
  
  const modalCreatedDate = document.getElementById('modal-created-date');
  const modalModifiedDate = document.getElementById('modal-modified-date');
  
  const modalTitleDisplay = document.getElementById('modal-title-display');
  const modalTitleInput = document.getElementById('modal-title-input');
  const modalTitleError = document.getElementById('modal-title-error');
  
  const modalStarsDisplay = document.getElementById('modal-stars-display');
  const modalRatingScore = document.getElementById('modal-rating-score');
  
  const modalStarRatingInput = document.getElementById('modal-star-rating-input');
  const modalStarInputSvgs = modalStarRatingInput.querySelectorAll('.star-star');
  const modalRatingValueDisplay = document.getElementById('modal-rating-value-display');

  const modalReviewDisplay = document.getElementById('modal-review-display');
  const modalReviewInput = document.getElementById('modal-review-input');
  const modalImageInput = document.getElementById('modal-image-input');

  const modalDeleteBtn = document.getElementById('modal-delete-btn');
  const modalEditBtn = document.getElementById('modal-edit-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalSaveBtn = document.getElementById('modal-save-btn');

  // ==========================================================================
  // 2. Data Initialization (LocalStorage & Schema Migration)
  // ==========================================================================
  function loadRecords() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      records = data ? JSON.parse(data) : [];
      
      // Database migration: map legacy 'date' to 'createdDate'
      records.forEach(rec => {
        if (!rec.createdDate && rec.date) {
          rec.createdDate = rec.date;
        }
      });
    } catch (e) {
      console.error('LocalStorage load failed:', e);
      records = [];
    }
  }

  function saveRecords() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('LocalStorage save failed:', e);
      alert('데이터 저장 중 문제가 발생했습니다. 브라우저 용량이나 설정을 확인해 주세요.');
    }
  }

  // ==========================================================================
  // 3. Helper Functions
  // ==========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Get Fallback Image HTML based on Category
  function getFallbackCoverHtml(category) {
    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.book;
    return `
      <div class="card-fallback-cover ${config.theme}">
        <span class="card-fallback-icon">${config.icon}</span>
        <span class="card-fallback-label">${config.label}</span>
      </div>
    `;
  }

  // Render Static Star Ratings (using SVGs)
  function renderStaticStars(rating) {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      let fill = 'var(--star-empty)';
      if (i <= Math.floor(rating)) {
        fill = 'var(--star-filled)';
      } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
        fill = 'url(#half-star-grad)';
      }
      starsHtml += `
        <svg viewBox="0 0 24 24" style="fill: ${fill};">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        </svg>
      `;
    }
    return starsHtml;
  }

  // ==========================================================================
  // 4. Interactive Star Rating System (0.5 point scale)
  // ==========================================================================
  
  // 4A. Creation Form Star Rating Control
  function updateInteractiveStars(ratingVal) {
    starInputSvgs.forEach((starWrapper, idx) => {
      const starNumber = idx + 1;
      const svg = starWrapper.querySelector('svg');
      if (starNumber <= Math.floor(ratingVal)) {
        svg.style.fill = 'var(--star-filled)';
      } else if (starNumber === Math.ceil(ratingVal) && ratingVal % 1 !== 0) {
        svg.style.fill = 'url(#half-star-grad)';
      } else {
        svg.style.fill = 'var(--star-empty)';
      }
    });
    ratingValueDisplay.textContent = `(${ratingVal.toFixed(1)}점)`;
  }

  starInputSvgs.forEach((starWrapper, idx) => {
    const starNumber = idx + 1;

    // Hover effect tracking
    starWrapper.addEventListener('pointermove', (e) => {
      const rect = starWrapper.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const isHalf = relativeX < rect.width / 2;
      const tempRating = isHalf ? starNumber - 0.5 : starNumber;
      updateInteractiveStars(tempRating);
    });

    // Selection lock
    starWrapper.addEventListener('click', (e) => {
      const rect = starWrapper.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const isHalf = relativeX < rect.width / 2;
      currentRating = isHalf ? starNumber - 0.5 : starNumber;
      updateInteractiveStars(currentRating);
    });
  });

  // Restore active selection rating on mouse leave
  starRatingInput.addEventListener('pointerleave', () => {
    updateInteractiveStars(currentRating);
  });


  // 4B. Edit Modal Star Rating Control
  function updateModalInteractiveStars(ratingVal) {
    modalStarInputSvgs.forEach((starWrapper, idx) => {
      const starNumber = idx + 1;
      const svg = starWrapper.querySelector('svg');
      if (starNumber <= Math.floor(ratingVal)) {
        svg.style.fill = 'var(--star-filled)';
      } else if (starNumber === Math.ceil(ratingVal) && ratingVal % 1 !== 0) {
        svg.style.fill = 'url(#half-star-grad)';
      } else {
        svg.style.fill = 'var(--star-empty)';
      }
    });
    modalRatingValueDisplay.textContent = `(${ratingVal.toFixed(1)}점)`;
  }

  modalStarInputSvgs.forEach((starWrapper, idx) => {
    const starNumber = idx + 1;

    // Hover effect tracking
    starWrapper.addEventListener('pointermove', (e) => {
      if (!isEditingMode) return;
      const rect = starWrapper.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const isHalf = relativeX < rect.width / 2;
      const tempRating = isHalf ? starNumber - 0.5 : starNumber;
      updateModalInteractiveStars(tempRating);
    });

    // Selection lock
    starWrapper.addEventListener('click', (e) => {
      if (!isEditingMode) return;
      const rect = starWrapper.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const isHalf = relativeX < rect.width / 2;
      editRating = isHalf ? starNumber - 0.5 : starNumber;
      updateModalInteractiveStars(editRating);
    });
  });

  // Restore active selection rating on mouse leave
  modalStarRatingInput.addEventListener('pointerleave', () => {
    if (!isEditingMode) return;
    updateModalInteractiveStars(editRating);
  });

  // ==========================================================================
  // 5. Dashboard Renderer
  // ==========================================================================
  function renderDashboard() {
    // Filter records for active tab
    const filteredRecords = records.filter(rec => rec.category === currentCategory);

    // Fade out effect before reload
    cardsGridView.style.opacity = '0';

    setTimeout(() => {
      if (filteredRecords.length === 0) {
        cardsGridView.classList.add('hidden');
        emptyStateView.classList.remove('hidden');
      } else {
        emptyStateView.classList.add('hidden');
        cardsGridView.classList.remove('hidden');
        
        cardsGridView.innerHTML = '';
        
        filteredRecords.forEach(rec => {
          const card = document.createElement('div');
          card.className = 'card-item';
          card.setAttribute('role', 'button');
          card.setAttribute('tabindex', '0');
          card.setAttribute('aria-label', `${rec.title} 상세 보기`);

          // Cover Image block
          let coverHtml = '';
          if (rec.imageUrl && rec.imageUrl.trim() !== '') {
            coverHtml = `
              <img src="${escapeHtml(rec.imageUrl)}" alt="${escapeHtml(rec.title)}" loading="lazy"
                onerror="this.onerror=null; this.outerHTML='${getFallbackCoverHtml(rec.category).trim().replace(/'/g, "\\'")}'">
            `;
          } else {
            coverHtml = getFallbackCoverHtml(rec.category);
          }

          // Decide date display (Show edited tag if modified)
          const dateToShow = rec.modifiedDate 
            ? `${rec.modifiedDate} (수정됨)` 
            : (rec.createdDate || rec.date || '-');

          card.innerHTML = `
            <div class="card-poster">
              ${coverHtml}
            </div>
            <div class="card-info">
              <h3 class="card-title">${escapeHtml(rec.title)}</h3>
              <div class="card-meta">
                <div class="card-rating-display">
                  <span class="mini-star-icon">★</span>
                  <span class="mini-score">${rec.rating.toFixed(1)}</span>
                </div>
                <span class="card-date">${dateToShow}</span>
              </div>
            </div>
          `;

          // Event Listeners for Open Modal
          card.addEventListener('click', () => openDetailModal(rec.id));
          card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openDetailModal(rec.id);
            }
          });

          cardsGridView.appendChild(card);
        });
      }
      cardsGridView.style.opacity = '1';
    }, 150);
  }

  // ==========================================================================
  // 6. Category Tab Switching
  // ==========================================================================
  function switchCategory(category) {
    if (currentCategory === category) return;

    currentCategory = category;

    // Toggle active state in UI
    Object.keys(tabButtons).forEach(cat => {
      if (cat === category) {
        tabButtons[cat].classList.add('active');
        tabButtons[cat].setAttribute('aria-selected', 'true');
      } else {
        tabButtons[cat].classList.remove('active');
        tabButtons[cat].setAttribute('aria-selected', 'false');
      }
    });

    // Update Form Title Category Badge
    const config = CATEGORY_CONFIG[category];
    formCategoryBadge.textContent = config.label;
    formCategoryBadge.className = `category-badge ${config.theme}`;

    // Reload list
    renderDashboard();
  }

  Object.keys(tabButtons).forEach(category => {
    tabButtons[category].addEventListener('click', () => switchCategory(category));
  });

  // ==========================================================================
  // 7. Creation Form Validation & Submission
  // ==========================================================================
  
  // Real-time Title Input Validation (clearing error warning)
  titleInput.addEventListener('input', () => {
    if (titleInput.value.trim() !== '') {
      titleInput.classList.remove('input-error');
      titleError.textContent = '';
    }
  });

  recordForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const titleVal = titleInput.value.trim();
    const imageUrlVal = imageInput.value.trim();
    const reviewVal = reviewInput.value.trim();

    // 1. Validation check
    if (titleVal === '') {
      titleInput.classList.add('input-error');
      titleInput.focus();
      titleError.textContent = '콘텐츠 제목을 입력해 주세요.';
      titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 2. Format current date
    const now = new Date();
    const formattedDate = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

    // 3. Construct record object
    const newRecord = {
      id: Date.now().toString(),
      category: currentCategory,
      title: titleVal,
      imageUrl: imageUrlVal,
      rating: currentRating,
      review: reviewVal,
      createdDate: formattedDate,
      modifiedDate: null
    };

    // 4. Save to State & LocalStorage
    records.unshift(newRecord); // Prepend to show newest first
    saveRecords();

    // 5. Reset form states
    recordForm.reset();
    currentRating = 0.0;
    updateInteractiveStars(currentRating);
    titleError.textContent = '';
    titleInput.classList.remove('input-error');

    // 6. Refresh Grid UI
    renderDashboard();
  });

  // ==========================================================================
  // 8. Detail Modal Views, Inline Editing, & Deletion
  // ==========================================================================
  
  function openDetailModal(recordId) {
    const rec = records.find(r => r.id === recordId);
    if (!rec) return;

    selectedRecordId = recordId;
    isEditingMode = false;
    modalContent.classList.remove('is-editing');

    // Category Badge
    const config = CATEGORY_CONFIG[rec.category] || CATEGORY_CONFIG.book;
    modalCategoryBadge.textContent = config.label;
    modalCategoryBadge.className = `category-tag ${config.theme}`;

    // Title
    modalTitleDisplay.textContent = rec.title;

    // Date displays (Created & Modified)
    modalCreatedDate.textContent = `등록: ${rec.createdDate || rec.date || '-'}`;
    if (rec.modifiedDate) {
      modalModifiedDate.textContent = `수정: ${rec.modifiedDate}`;
      modalModifiedDate.style.display = 'inline-block';
    } else {
      modalModifiedDate.style.display = 'none';
    }

    // Review content
    if (rec.review && rec.review.trim() !== '') {
      modalReviewDisplay.textContent = rec.review;
    } else {
      modalReviewDisplay.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">작성된 감상평이 없습니다.</span>';
    }

    // Rating Display
    modalStarsDisplay.innerHTML = renderStaticStars(rec.rating);
    modalRatingScore.textContent = rec.rating.toFixed(1);

    // Poster Image
    modalPoster.innerHTML = '';
    if (rec.imageUrl && rec.imageUrl.trim() !== '') {
      const img = document.createElement('img');
      img.src = rec.imageUrl;
      img.alt = rec.title;
      img.onerror = () => {
        img.onerror = null;
        modalPoster.innerHTML = getFallbackCoverHtml(rec.category);
      };
      modalPoster.appendChild(img);
    } else {
      modalPoster.innerHTML = getFallbackCoverHtml(rec.category);
    }

    // Open Modal
    detailModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Lock background scroll
    modalCloseBtn.focus();
  }

  function closeDetailModal() {
    detailModal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore scroll
    selectedRecordId = null;
    isEditingMode = false;
    modalContent.classList.remove('is-editing');
  }

  // Delete Action
  modalDeleteBtn.addEventListener('click', () => {
    if (!selectedRecordId) return;

    const isConfirmed = confirm('정말 이 감상 기록을 삭제하시겠습니까?');
    if (isConfirmed) {
      records = records.filter(r => r.id !== selectedRecordId);
      saveRecords();
      closeDetailModal();
      renderDashboard();
    }
  });

  // Edit Mode Activation Action
  modalEditBtn.addEventListener('click', () => {
    const rec = records.find(r => r.id === selectedRecordId);
    if (!rec) return;

    isEditingMode = true;
    modalContent.classList.add('is-editing');

    // Fill in edit fields
    modalTitleInput.value = rec.title;
    modalReviewInput.value = rec.review || '';
    modalImageInput.value = rec.imageUrl || '';
    editRating = rec.rating;

    // Reset error validation styles inside modal
    modalTitleInput.classList.remove('input-error');
    modalTitleError.textContent = '';

    // Update Interactive Star Display in modal
    updateModalInteractiveStars(editRating);
    modalTitleInput.focus();
  });

  // Real-time Title Input Validation in Modal
  modalTitleInput.addEventListener('input', () => {
    if (modalTitleInput.value.trim() !== '') {
      modalTitleInput.classList.remove('input-error');
      modalTitleError.textContent = '';
    }
  });

  // Cancel Edit Action
  modalCancelBtn.addEventListener('click', () => {
    isEditingMode = false;
    modalContent.classList.remove('is-editing');
  });

  // Save Edit Action
  modalSaveBtn.addEventListener('click', () => {
    const titleVal = modalTitleInput.value.trim();
    const imageVal = modalImageInput.value.trim();
    const reviewVal = modalReviewInput.value.trim();

    // Validate Title
    if (titleVal === '') {
      modalTitleInput.classList.add('input-error');
      modalTitleInput.focus();
      modalTitleError.textContent = '콘텐츠 제목을 입력해 주세요.';
      return;
    }

    const recIndex = records.findIndex(r => r.id === selectedRecordId);
    if (recIndex === -1) return;

    // Format modified date
    const now = new Date();
    const formattedDate = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

    // Update record
    records[recIndex].title = titleVal;
    records[recIndex].imageUrl = imageVal;
    records[recIndex].review = reviewVal;
    records[recIndex].rating = editRating;
    records[recIndex].modifiedDate = formattedDate;

    // Save and Sync
    saveRecords();
    isEditingMode = false;
    modalContent.classList.remove('is-editing');

    // Refresh UI
    renderDashboard();
    openDetailModal(selectedRecordId); // Rerender modal to show details state
  });

  // Modal closure events
  modalCloseBtn.addEventListener('click', closeDetailModal);
  
  detailModal.addEventListener('click', (e) => {
    // Close modal if user clicks on backdrop itself and is NOT in editing mode 
    // to prevent losing unsaved edits accidentally
    if (e.target === detailModal) {
      if (isEditingMode) {
        const discard = confirm('수정 중인 내용이 있습니다. 수정을 취소하고 창을 닫으시겠습니까?');
        if (!discard) return;
      }
      closeDetailModal();
    }
  });

  // ESC key listener for modal closure
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !detailModal.classList.contains('hidden')) {
      if (isEditingMode) {
        const discard = confirm('수정 중인 내용이 있습니다. 수정을 취소하고 창을 닫으시겠습니까?');
        if (!discard) return;
      }
      closeDetailModal();
    }
  });

  // ==========================================================================
  // 9. Startup Operations
  // ==========================================================================
  loadRecords();
  renderDashboard();
  updateInteractiveStars(0.0);
});
