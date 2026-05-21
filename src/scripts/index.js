/*
  Файл index.js является точкой входа в наше приложение
  и только он должен содержать логику инициализации нашего приложения
  используя при этом импорты из других файлов

  Из index.js не допускается что то экспортировать
*/

import { getCardList, getUserInfo, setUserInfo, setAvatar, addNewCard, deleteCard as deleteCardApi, changeLikeCardStatus } from "./components/api.js";
import { createCardElement, deleteCard, updateLike } from "./components/card.js";
import { openModalWindow, closeModalWindow, setCloseModalWindowEventListeners } from "./components/modal.js";
import { enableValidation, clearValidation } from "./components/validation.js";

const validationSettings = {
  formSelector: ".popup__form",
  inputSelector: ".popup__input",
  submitButtonSelector: ".popup__button",
  inactiveButtonClass: "popup__button_disabled",
  inputErrorClass: "popup__input_type_error",
  errorClass: "popup__error_visible",
};

enableValidation(validationSettings);

// DOM узлы
const placesWrap = document.querySelector(".places__list");
const profileFormModalWindow = document.querySelector(".popup_type_edit");
const profileForm = profileFormModalWindow.querySelector(".popup__form");
const profileTitleInput = profileForm.querySelector(".popup__input_type_name");
const profileDescriptionInput = profileForm.querySelector(".popup__input_type_description");

const cardFormModalWindow = document.querySelector(".popup_type_new-card");
const cardForm = cardFormModalWindow.querySelector(".popup__form");
const cardNameInput = cardForm.querySelector(".popup__input_type_card-name");
const cardLinkInput = cardForm.querySelector(".popup__input_type_url");

const imageModalWindow = document.querySelector(".popup_type_image");
const imageElement = imageModalWindow.querySelector(".popup__image");
const imageCaption = imageModalWindow.querySelector(".popup__caption");

const openProfileFormButton = document.querySelector(".profile__edit-button");
const openCardFormButton = document.querySelector(".profile__add-button");

const profileTitle = document.querySelector(".profile__title");
const profileDescription = document.querySelector(".profile__description");
const profileAvatar = document.querySelector(".profile__image");

const avatarFormModalWindow = document.querySelector(".popup_type_edit-avatar");
const avatarForm = avatarFormModalWindow.querySelector(".popup__form");
const avatarInput = avatarForm.querySelector(".popup__input");

const infoModalWindow = document.querySelector(".popup_type_info");
const infoTitle = infoModalWindow.querySelector(".popup__title");
const infoStatsList = infoModalWindow.querySelector(".popup__info");
const infoText = infoModalWindow.querySelector(".popup__text");
const infoPopularList = infoModalWindow.querySelector(".popup__list");

let currentUserId = null;

const logo = document.querySelector(".logo");


const renderLoading = (isLoading, button, loadingText = "Сохранение...") => {
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
  } else {
    button.textContent = button.dataset.originalText;
  }
};

const handleLikeCard = (likeButton, likeCount, cardId, isLiked) => {
  changeLikeCardStatus(cardId, isLiked)
    .then((updatedCard) => {
      updateLike(likeButton, likeCount, updatedCard.likes.length);
    })
    .catch((err) => {
      console.log(err);
    });
};

const handleDeleteCard = (cardElement, cardId) => {
  deleteCardApi(cardId)
    .then(() => {
      deleteCard(cardElement);
    })
    .catch((err) => {
      console.log(err);
    });
};

const handlePreviewPicture = ({ name, link }) => {
  imageElement.src = link;
  imageElement.alt = name;
  imageCaption.textContent = name;
  openModalWindow(imageModalWindow);
};

const handleProfileFormSubmit = (evt) => {
  evt.preventDefault();
  const button = profileForm.querySelector(".popup__button");
  renderLoading(true, button);
  setUserInfo({
    name: profileTitleInput.value,
    about: profileDescriptionInput.value,
  })
    .then((userData) => {
      profileTitle.textContent = userData.name;
      profileDescription.textContent = userData.about;
      closeModalWindow(profileFormModalWindow);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      renderLoading(false, button);
    });
};

const handleAvatarFromSubmit = (evt) => {
  evt.preventDefault();
  const button = avatarForm.querySelector(".popup__button");
  renderLoading(true, button);
  const newAvatarUrl = avatarInput.value;
  setAvatar({ avatar: newAvatarUrl })
    .then((userData) => {
      profileAvatar.style.backgroundImage = `url(${userData.avatar})`;
      closeModalWindow(avatarFormModalWindow);
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      renderLoading(false, button);
    });
};

const handleCardFormSubmit = (evt) => {
  evt.preventDefault();
  const button = cardForm.querySelector(".popup__button");
  renderLoading(true, button, "Создание...");
  const cardName = cardNameInput.value;
  const cardLink = cardLinkInput.value;
  addNewCard({ name: cardName, link: cardLink })
    .then((newCardData) => {
      const cardElement = createCardElement(
        newCardData,
        {
          onPreviewPicture: handlePreviewPicture,
          onLikeIcon: handleLikeCard,
          onDeleteCard: handleDeleteCard,
        },
        currentUserId
      );
      placesWrap.prepend(cardElement);
      closeModalWindow(cardFormModalWindow);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      renderLoading(false, button);
    });
};

const createInfoItem = (term, description) => {
  const item = document
    .getElementById("popup-info-definition-template")
    .content.querySelector(".popup__info-item")
    .cloneNode(true);
  item.querySelector(".popup__info-term").textContent = term;
  item.querySelector(".popup__info-description").textContent = description;
  return item;
};

const handleInfoOpen = () => {
  getCardList()
    .then((cards) => {
      const totalLikes = cards.reduce((sum, card) => sum + card.likes.length, 0);
      const uniqueOwners = new Set(cards.map((c) => c.owner._id)).size;

      const likesByUser = {};
      cards.forEach((card) => {
        card.likes.forEach((user) => {
          if (!likesByUser[user._id]) {
            likesByUser[user._id] = { count: 0, name: user.name };
          }
          likesByUser[user._id].count++;
        });
      });

      let maxLikes = 0;
      let champion = "—";
      Object.values(likesByUser).forEach(({ count, name }) => {
        if (count > maxLikes) {
          maxLikes = count;
          champion = name;
        }
      });

      const popularCards = [...cards]
        .sort((a, b) => b.likes.length - a.likes.length)
        .slice(0, 3);

      infoTitle.textContent = "Статистика карточек";
      infoText.textContent = "Популярные карточки:";

      infoStatsList.innerHTML = "";
      [
        ["Всего пользователей:", uniqueOwners],
        ["Всего лайков:", totalLikes],
        ["Максимально лайков от одного:", maxLikes],
        ["Чемпион лайков:", champion],
      ].forEach(([term, description]) => {
        infoStatsList.append(createInfoItem(term, description));
      });

      infoPopularList.innerHTML = "";
      popularCards.forEach((card) => {
        const item = document
          .getElementById("popup-info-user-preview-template")
          .content.querySelector(".popup__list-item")
          .cloneNode(true);
        item.textContent = card.name;
        infoPopularList.append(item);
      });

      openModalWindow(infoModalWindow);
    })
    .catch((err) => {
      console.log(err);
    });
};

// EventListeners
profileForm.addEventListener("submit", handleProfileFormSubmit);
cardForm.addEventListener("submit", handleCardFormSubmit);
avatarForm.addEventListener("submit", handleAvatarFromSubmit);

openProfileFormButton.addEventListener("click", () => {
  profileTitleInput.value = profileTitle.textContent;
  profileDescriptionInput.value = profileDescription.textContent;
  openModalWindow(profileFormModalWindow);
});

profileAvatar.addEventListener("click", () => {
  avatarForm.reset();
  openModalWindow(avatarFormModalWindow);
});

openCardFormButton.addEventListener("click", () => {
  cardForm.reset();
  openModalWindow(cardFormModalWindow);
});

logo.addEventListener("click", handleInfoOpen);

//настраиваем обработчики закрытия попапов
const allPopups = document.querySelectorAll(".popup");
allPopups.forEach((popup) => {
  setCloseModalWindowEventListeners(popup);
});

Promise.all([getCardList(), getUserInfo()])
  .then(([cards, userData]) => {
    currentUserId = userData._id;
    profileTitle.textContent = userData.name;
    profileDescription.textContent = userData.about;
    profileAvatar.style.backgroundImage = `url(${userData.avatar})`;

    placesWrap.innerHTML = '';

    cards.forEach((cardData) => {
      const cardElement = createCardElement(
        cardData,
        {
          onPreviewPicture: handlePreviewPicture,
          onLikeIcon: handleLikeCard,
          onDeleteCard: handleDeleteCard,
        },
        currentUserId
      );
      placesWrap.append(cardElement);
    });
  })
  .catch((err) => {
    console.log(err); // В случае возникновения ошибки выводим её в консоль
  });