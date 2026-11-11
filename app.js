const ingredientCategories = [
  { title: 'Овощи и зелень', icon: '<svg viewBox="0 0 24 24"><path d="M20 4C11 4 5 8 5 15c0 3 2 5 5 5 7 0 10-7 10-16ZM4 20c4-5 7-8 12-11"/></svg>', items: ['Помидоры', 'Огурцы', 'Картофель', 'Морковь', 'Лук', 'Чеснок', 'Шпинат', 'Болгарский перец'] },
  { title: 'Мясо и птица', icon: '<svg viewBox="0 0 24 24"><path d="M4 7h16l-2 10H6L4 7Zm4 10v3m8-3v3M8 7l1-3h6l1 3"/></svg>', items: ['Курица', 'Говядина', 'Фарш', 'Бекон', 'Индейка'] },
  { title: 'Рыба и морепродукты', icon: '<svg viewBox="0 0 24 24"><path d="M3 12s4-6 11-6 8 6 8 6-3 6-8 6-11-6-11-6Zm0 0-2-4v8l2-4Zm11-2h.01"/></svg>', items: ['Лосось', 'Тунец', 'Креветки', 'Белая рыба'] },
  { title: 'Молочные продукты и яйца', icon: '<svg viewBox="0 0 24 24"><path d="M12 3c-3 0-6 7-6 12a6 6 0 0 0 12 0c0-5-3-12-6-12Z"/></svg>', items: ['Яйца', 'Сыр', 'Молоко', 'Сметана', 'Творог'] },
  { title: 'Крупы и паста', icon: '<svg viewBox="0 0 24 24"><path d="M12 21V4m0 4C8 7 6 5 6 3m6 9c4-1 6-3 6-6m-6 9c-4-1-6-3-6-6m6 9c4-1 6-3 6-6"/></svg>', items: ['Рис', 'Гречка', 'Макароны', 'Овсянка', 'Кускус'] },
  { title: 'Бобовые и другое', icon: '<svg viewBox="0 0 24 24"><path d="M6 4c5 0 8 4 8 9s-3 7-7 7-5-3-5-7 1-9 4-9Zm10 2c4 0 6 3 6 7s-2 6-5 6-5-2-5-5 1-8 4-8Z"/></svg>', items: ['Нут', 'Фасоль', 'Чечевица', 'Грибы', 'Тортилья'] },
  { title: 'Приправы', icon: '<svg viewBox="0 0 24 24"><path d="M8 4h8v3l2 2v11H6V9l2-2V4Zm0 5h8m-5-2h2m-2-1h2"/></svg>', items: ['Соевый соус', 'Томатная паста', 'Лимон', 'Оливковое масло', 'Горчица'] }
];

const ingredientGroups = document.querySelector('#ingredient-groups');
const generateButton = document.querySelector('#generate-button');
const apiKeyInput = document.querySelector('#api-key');
const extraIngredientsInput = document.querySelector('#extra-ingredients');
const recipeEmpty = document.querySelector('#recipe-empty');
const recipeResult = document.querySelector('#recipe-result');
const recipeContent = document.querySelector('#recipe-content');
const loadingState = document.querySelector('#loading-state');
const errorMessage = document.querySelector('#error-message');
const dishImage = document.querySelector('#dish-image');
const dishImageLoading = document.querySelector('#dish-image-loading');
const dishImageError = document.querySelector('#dish-image-error');

function renderIngredientOptions() {
  ingredientGroups.innerHTML = ingredientCategories.map((category, categoryIndex) => `
    <fieldset class="ingredient-group">
      <legend class="group-title"><span class="group-icon" aria-hidden="true">${category.icon}</span>${category.title}</legend>
      <div class="ingredient-list">
        ${category.items.map((item, itemIndex) => `
          <label class="ingredient-option">
            <input type="checkbox" name="ingredient" value="${item}" id="ingredient-${categoryIndex}-${itemIndex}" />
            <span>${item}</span>
          </label>
        `).join('')}
      </div>
    </fieldset>
  `).join('');
}

function getSelectedIngredients() {
  const checkedIngredients = [...ingredientGroups.querySelectorAll('input:checked')].map((input) => input.value);
  const customIngredients = extraIngredientsInput.value.split(',').map((item) => item.trim()).filter(Boolean);
  return [...new Set([...checkedIngredients, ...customIngredients])];
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function setLoading(isLoading) {
  generateButton.disabled = isLoading;
  generateButton.querySelector('span:first-child').textContent = isLoading ? 'Готовим рецепт…' : 'Сгенерировать рецепт';
  loadingState.hidden = !isLoading;
  if (isLoading) {
    errorMessage.hidden = true;
    recipeEmpty.hidden = true;
    recipeResult.hidden = true;
  }
}

async function generateDishImage(apiKey, recipe) {
  const prompt = `Photorealistic editorial food photography of the finished dish described by this recipe. Dish: ${recipe.split(/\r?\n/)[0]}. Recipe details: ${recipe.slice(0, 900)}. Show one appetizing plated serving, natural window light, elegant but realistic plating, close-up 4:3 composition, no text, no watermark.`;
  const response = await fetch('https://routerai.ru/api/v1/images', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'black-forest-labs/flux-3-image-klein',
      prompt,
      n: 1,
      aspect_ratio: '4:3',
      resolution: '1K',
      output_format: 'jpeg'
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error?.message || `Сервис изображений вернул ошибку (${response.status}).`);
  }

  const image = data?.data?.[0];
  const imageSource = image?.b64_json
    ? `data:${image.media_type || 'image/jpeg'};base64,${image.b64_json}`
    : image?.url;
  if (typeof imageSource !== 'string') {
    throw new Error('RouterAI не вернул файл изображения.');
  }

  dishImage.src = imageSource;
  dishImage.hidden = false;
  dishImageLoading.hidden = true;
}

async function generateRecipe() {
  const ingredients = getSelectedIngredients();
  const apiKey = apiKeyInput.value.trim();

  if (ingredients.length === 0) {
    showError('Выбери хотя бы один продукт или впиши его в поле «Ещё что-нибудь».');
    return;
  }
  if (!apiKey) {
    showError('Введи ключ RouterAI, чтобы сгенерировать рецепт.');
    apiKeyInput.focus();
    return;
  }

  setLoading(true);
  dishImage.removeAttribute('src');
  dishImage.hidden = true;
  dishImageLoading.hidden = true;
  dishImageError.hidden = true;
  try {
    const response = await fetch('https://routerai.ru/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v4.1-flash-1017',
        messages: [
          {
            role: 'system',
            content: 'Ты — дружелюбный кулинарный помощник. Придумай один понятный, вкусный и выполнимый рецепт на русском языке, используя прежде всего перечисленные продукты. Не добавляй другие основные продукты; базовые соль, перец и вода допустимы. Ответь обычным текстом без Markdown-разметки в формате: название блюда; время приготовления; ингредиенты с примерными количествами; пошаговое приготовление; короткий совет. Если сочетание необычное, найди безопасный и разумный вариант.'
          },
          { role: 'user', content: `Продукты, которые у меня есть: ${ingredients.join(', ')}. Составь рецепт.` }
        ],
        temperature: 0.8,
        max_tokens: 900
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const apiError = data?.error?.message;
      throw new Error(apiError || `RouterAI вернул ошибку (${response.status}). Проверь ключ и баланс.`);
    }

    const recipe = data?.choices?.[0]?.message?.content;
    if (typeof recipe !== 'string' || !recipe.trim()) {
      throw new Error('ИИ не вернул рецепт. Попробуй сгенерировать ещё раз.');
    }

    recipeContent.textContent = recipe.trim();
    recipeEmpty.hidden = true;
    recipeResult.hidden = false;
    dishImageLoading.hidden = false;
    loadingState.hidden = true;

    try {
      await generateDishImage(apiKey, recipe.trim());
    } catch (imageError) {
      dishImageLoading.hidden = true;
      dishImageError.textContent = imageError instanceof Error
        ? `Рецепт готов, но изображение не создано: ${imageError.message}`
        : 'Рецепт готов, но изображение не удалось создать.';
      dishImageError.hidden = false;
    }
  } catch (error) {
    recipeEmpty.hidden = true;
    showError(error instanceof Error ? error.message : 'Не удалось связаться с RouterAI. Проверь подключение к интернету.');
  } finally {
    setLoading(false);
  }
}

renderIngredientOptions();
generateButton.addEventListener('click', generateRecipe);
document.querySelector('#clear-selection').addEventListener('click', () => {
  ingredientGroups.querySelectorAll('input:checked').forEach((input) => { input.checked = false; });
  extraIngredientsInput.value = '';
  errorMessage.hidden = true;
});
document.querySelector('#copy-recipe').addEventListener('click', async (event) => {
  try {
    await navigator.clipboard.writeText(recipeContent.textContent);
    event.currentTarget.textContent = 'Скопировано';
    window.setTimeout(() => { event.currentTarget.textContent = 'Скопировать'; }, 1800);
  } catch {
    showError('Не получилось скопировать автоматически. Выдели текст рецепта и скопируй вручную.');
  }
});
