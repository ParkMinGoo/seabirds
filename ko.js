(function () {
  "use strict";

  const exact = new Map(Object.entries({
    "SeaBirds": "페레그린 로그북",
    "Dive log": "다이빙 로그",
    "Devices": "다이빙 컴퓨터",
    "Settings": "설정",
    "Local-first": "기기에 저장",
    "Sign in to sync across devices": "로그는 이 기기에 안전하게 저장됩니다",
    "WELCOME BACK": "다시 오신 것을 환영합니다",
    "Logbook summary": "로그북 요약",
    "Total dives": "총 다이빙",
    "in this logbook": "현재 로그북",
    "Total Bottom Time": "총 잠수 시간",
    "across all dives": "전체 다이빙 기준",
    "Max depth": "최대 수심",
    "Longest dive": "최장 다이빙",
    "personal record": "개인 기록",
    "Your DCs": "내 다이빙 컴퓨터",
    "dive computers used for downloads": "로그를 내려받은 다이빙 컴퓨터",
    "Most used DC mode": "가장 많이 사용한 모드",
    "Most used style": "가장 많이 사용한 스타일",
    "Most used type": "가장 많이 사용한 유형",
    "LOGBOOK": "로그북",
    "Your underwater story, beautifully recorded.": "수중에서의 추억을 아름답게 기록하세요.",
    "Your underwater story,": "수중에서의 추억을",
    "beautifully recorded.": "아름답게 기록하세요.",
    "SeaBirds Dive Log home": "페레그린 로그북 홈",
    "by Three Cats LSP": "제작: Three Cats LSP",
    "Open menu": "메뉴 열기",
    "Search site, notes, buddy…": "포인트, 메모, 버디 검색…",
    "No dives found": "다이빙 기록이 없습니다",
    "Change the search or filters to show more dives.": "검색어나 필터를 변경해 보세요.",
    "Dive log pages": "다이빙 로그 페이지",
    "Previous": "이전",
    "Next": "다음",
    "Sort:": "정렬:",
    "+ Add dive": "+ 다이빙 추가",
    "Filters": "필터",
    "Year": "연도",
    "All years": "전체 연도",
    "Month": "월",
    "All months": "전체 월",
    "Mode": "모드",
    "Group": "그룹",
    "All": "전체",
    "BLUETOOTH": "블루투스",
    "Dive computers": "다이빙 컴퓨터",
    "Connect to dive computer": "다이빙 컴퓨터 연결",
    "No device connected": "연결된 기기 없음",
    "Select your Shearwater model and connect.": "Shearwater 모델을 선택한 후 연결하세요.",
    "Download dives from your Shearwater, review every profile, and keep the memories that matter. Put your dive computer into Bluetooth mode, select its model, then connect.": "Shearwater에서 다이빙 로그를 내려받고 프로필과 소중한 추억을 보관하세요. 다이빙 컴퓨터를 블루투스 모드로 전환하고 모델을 선택한 다음 연결하세요.",
    "Dive computer model": "다이빙 컴퓨터 모델",
    "Sync computer time from this PC/phone": "휴대폰 시간으로 다이빙 컴퓨터 동기화",
    "Download dives": "다이빙 로그 다운로드",
    "SUPPORTED": "지원 모델",
    "Shearwater Computers": "Shearwater 다이빙 컴퓨터",
    "PREFERENCES": "환경설정",
    "Google cloud sync": "Google 클라우드 동기화",
    "Not signed in": "로그인하지 않음",
    "Sign in with Google": "Google로 로그인",
    "Logbook backup": "로그북 백업",
    "Backup JSON": "JSON 백업",
    "Restore JSON": "JSON 복원",
    "Logbook display": "로그북 표시",
    "Choose how many dives are shown on each page.": "페이지마다 표시할 다이빙 개수를 선택합니다.",
    "Dives per page": "페이지당 다이빙",
    "Units & formats": "단위 및 형식",
    "Depth units": "수심 단위",
    "Metres (m)": "미터 (m)",
    "Feet (ft)": "피트 (ft)",
    "Temperature units": "수온 단위",
    "Celsius (°C)": "섭씨 (°C)",
    "Fahrenheit (°F)": "화씨 (°F)",
    "Volume units": "용량 단위",
    "Weight units": "무게 단위",
    "Pressure units": "압력 단위",
    "Date format": "날짜 형식",
    "Time format": "시간 형식",
    "12 hour": "12시간제",
    "24 hour": "24시간제",
    "Diving Equipment master lists": "다이빙 장비 목록",
    "Equipment list templates": "자주 쓰는 장비 목록을 관리합니다",
    "Manage lists": "장비 목록 관리",
    "Dive groups": "다이빙 그룹",
    "Manage groups": "그룹 관리",
    "Support": "지원",
    "Load sample dives": "샘플 다이빙 불러오기",
    "Clear local data": "로컬 데이터 모두 삭제",
    "EQUIPMENT": "장비",
    "Your equipment lists": "내 장비 목록",
    "+ Add list": "+ 목록 추가",
    "Save master lists": "장비 목록 저장",
    "Back to Settings": "설정으로 돌아가기",
    "Add equipment": "장비 추가",
    "Rename card": "목록 이름 변경",
    "Delete card": "목록 삭제",
    "Rename equipment": "장비 이름 변경",
    "Remove equipment": "장비 삭제",
    "New dive group": "새 다이빙 그룹",
    "Edit dive group": "다이빙 그룹 수정",
    "Manual collection": "수동 그룹",
    "Edit group": "그룹 수정",
    "Delete group": "그룹 삭제",
    "Save group": "그룹 저장",
    "Cancel": "취소",
    "Save": "저장",
    "Delete": "삭제",
    "Close": "닫기",
    "OK": "확인",
    "Something went wrong": "오류가 발생했습니다",
    "DIVE COMPUTER": "다이빙 컴퓨터",
    "Choose dives to download": "다운로드할 다이빙 선택",
    "Select new": "새 로그 선택",
    "Select all": "전체 선택",
    "Select none": "선택 해제",
    "Download selected": "선택한 로그 다운로드",
    "Select dives to download": "다운로드할 다이빙을 선택하세요",
    "New": "새 로그",
    "Already in log": "이미 저장됨",
    "Previously deleted": "이전에 삭제됨",
    "Choose dives": "로그 선택",
    "Connecting with Bluetooth Low Energy…": "Bluetooth LE로 연결 중…",
    "Connecting to Bluetooth…": "Bluetooth 연결 중…",
    "Bluetooth linked. Starting Shearwater protocol…": "Bluetooth 연결 완료. Shearwater 통신을 시작합니다…",
    "Reading dive manifest…": "다이빙 로그 목록을 읽는 중…",
    "Keep the dive computer on the Wait PC screen.": "다이빙 컴퓨터의 Bluetooth 대기 화면을 유지하세요.",
    "Shearwater connection failed": "Shearwater 연결 실패",
    "Synchronizing dive computer time…": "다이빙 컴퓨터 시간 동기화 중…",
    "Keep the dive computer connected until the transfer finishes.": "전송이 끝날 때까지 다이빙 컴퓨터 연결을 유지하세요.",
    "Selected dives downloaded": "선택한 다이빙 다운로드 완료",
    "Dive download failed": "다이빙 다운로드 실패",
    "The Shearwater did not answer the protocol command.": "Shearwater가 통신 명령에 응답하지 않았습니다.",
    "The Shearwater returned an invalid protocol frame.": "Shearwater에서 올바르지 않은 통신 데이터가 수신되었습니다.",
    "Shearwater rejected the log manifest request.": "Shearwater가 로그 목록 요청을 거부했습니다.",
    "Unexpected Shearwater manifest block.": "예상하지 못한 Shearwater 로그 블록이 수신되었습니다.",
    "Invalid compressed Shearwater dive block.": "Shearwater 다이빙 데이터의 압축 형식이 올바르지 않습니다.",
    "Shearwater did not close the manifest transfer cleanly.": "Shearwater 로그 전송이 정상적으로 종료되지 않았습니다.",
    "SeaBirds could not find the Shearwater serial characteristics.": "Shearwater Bluetooth 통신 채널을 찾지 못했습니다.",
    "The connected device does not expose the Shearwater log service.": "연결된 기기에서 Shearwater 로그 서비스를 찾을 수 없습니다.",
    "Bluetooth is unavailable in this browser.": "이 기기에서 Bluetooth를 사용할 수 없습니다.",
    "Downloaded dive has no usable opening/closing records.": "다운로드한 다이빙 로그에 사용할 수 있는 시작·종료 기록이 없습니다.",
    "Dive title": "다이빙 제목",
    "Dive #": "다이빙 번호",
    "Dive date": "다이빙 날짜",
    "Dive time": "다이빙 시간",
    "Start time": "시작 시간",
    "End time": "종료 시간",
    "Location": "지역",
    "Site": "다이빙 포인트",
    "Buddy": "버디",
    "Type": "유형",
    "Dive mode": "다이빙 모드",
    "DC mode": "컴퓨터 모드",
    "Dive style": "다이빙 스타일",
    "Salinity": "염도",
    "Maximum depth": "최대 수심",
    "Duration": "다이빙 시간",
    "Minimum water temp": "최저 수온",
    "Average temperature": "평균 수온",
    "Mean Depth": "평균 수심",
    "Maximum TTS": "최대 TTS",
    "Maximum CNS": "최대 CNS",
    "Gas used": "사용 기체",
    "Gas Used": "사용 기체",
    "Device GF": "기기 GF",
    "Model": "모델",
    "Serial": "시리얼 번호",
    "Firmware": "펌웨어",
    "Log version": "로그 버전",
    "Decompression model": "감압 모델",
    "Log fingerprint": "로그 식별값",
    "Notes": "메모",
    "Tags": "태그",
    "Equipment": "장비",
    "Profile": "프로필",
    "Information": "정보",
    "Export": "내보내기",
    "Air": "공기",
    "Nitrox": "나이트록스",
    "Gauge": "게이지",
    "Fresh": "민물",
    "Salt": "바닷물",
    "Single Tank": "싱글 탱크",
    "Double tanks": "더블 탱크",
    "Sidemount": "사이드마운트",
    "Shore/Beach": "해변 입수",
    "Boat": "보트 다이빙",
    "Manual": "직접 입력",
    "N/A": "해당 없음",
    "Newest": "최신순",
    "Oldest": "오래된 순",
    "Deepest": "깊은 수심순",
    "Computer": "다이빙 컴퓨터",
    "Untitled dive": "제목 없는 다이빙",
    "Dive details saved": "다이빙 정보가 저장되었습니다",
    "Dive deleted": "다이빙이 삭제되었습니다",
    "Local log cleared": "로컬 로그를 모두 삭제했습니다",
    "Google sign-in failed": "Google 로그인 실패"
    ,"SeaBirds apps": "페레그린 로그북 앱"
    ,"Download SeaBirds for your device.": "사용 중인 기기에 맞는 앱을 다운로드합니다."
    ,"SeaBirds for Android": "안드로이드용 페레그린 로그북"
    ,"Signed native APK · direct download": "서명된 안드로이드 APK · 직접 다운로드"
    ,"Download APK": "APK 다운로드"
    ,"SeaBirds for Windows": "Windows용 페레그린 로그북"
    ,"Version 1.1.0 · lightweight WebView2 installer": "버전 1.1.0 · 경량 WebView2 설치 파일"
    ,"Download EXE": "EXE 다운로드"
    ,"Back up or restore dives, profiles, equipment and settings.": "다이빙, 프로필, 장비 및 설정을 백업하거나 복원합니다."
    ,"Metric (litres)": "미터법 (리터)"
    ,"Imperial (cu ft)": "야드파운드법 (세제곱피트)"
    ,"Metric (kg)": "미터법 (kg)"
    ,"Imperial (lb)": "야드파운드법 (lb)"
    ,"Organize dives with automatic rules or manual collections.": "자동 규칙이나 수동 모음으로 다이빙을 정리합니다."
    ,"Found a bug or have a feature idea?": "오류를 발견했거나 새로운 기능을 제안하고 싶으신가요?"
    ,"Open an issue on GitHub": "GitHub에 의견 남기기"
    ,"For other inquiries, email": "기타 문의 이메일:"
    ,"Three Cats links & apps": "Three Cats 링크 및 앱"
    ,"SeaBirds on GitHub": "GitHub에서 페레그린 로그북 보기"
    ,"SeaBirds downloads": "페레그린 로그북 다운로드"
    ,"Follow @threecats_lsp on Instagram": "Instagram에서 @threecats_lsp 팔로우"
    ,"Three Cats designs on Thingiverse": "Thingiverse의 Three Cats 디자인"
    ,"Donations": "후원"
    ,"SeaBirds app icon": "앱 아이콘"
    ,"Profile icon": "프로필 아이콘"
    ,"Notes by Muhammad_Usman": "Muhammad_Usman의 메모 아이콘"
    ,"Equipment icon": "장비 아이콘"
    ,"Dive computer information": "다이빙 컴퓨터 정보 아이콘"
    ,"Export icon": "내보내기 아이콘"
    ,"Icons from Flaticon:": "Flaticon 아이콘 출처:"
    ,"Shearwater, the Shearwater logo, and Shearwater product names are trademarks or registered trademarks of Shearwater Research Inc. All other trademarks, logos, product names, and copyrighted materials are the property of their respective owners. SeaBirds is an independent application and is not affiliated with, endorsed by, or sponsored by Shearwater Research Inc.": "Shearwater, Shearwater 로고 및 Shearwater 제품명은 Shearwater Research Inc.의 상표 또는 등록상표입니다. 기타 모든 상표, 로고, 제품명 및 저작물은 각 소유자의 자산입니다. 이 앱은 독립적으로 제작되었으며 Shearwater Research Inc.와 제휴 관계가 없고, 승인이나 후원을 받지 않았습니다."
    ,"Add dive": "다이빙 추가"
    ,"Import dive": "다이빙 가져오기"
    ,"Import an existing UDDF dive-log file": "기존 UDDF 다이빙 로그 파일을 가져옵니다"
    ,"Manual Input": "직접 입력"
    ,"Create a new dive-log entry manually": "새 다이빙 로그를 직접 작성합니다"
    ,"DIVE LOG ENTRY": "다이빙 로그 작성"
    ,"Dive details": "다이빙 상세 정보"
    ,"Information and dive computer": "정보 및 다이빙 컴퓨터"
    ,"Export dive": "다이빙 내보내기"
    ,"Maldives, Dive 1": "제주도, 다이빙 1"
    ,"City, region or country": "도시, 지역 또는 국가"
    ,"Reef, wreck or boat dive": "리프, 난파선 또는 보트 다이빙"
    ,"Buddy name": "버디 이름"
    ,"Air, EAN32, Tx 18/45": "공기, EAN32, Tx 18/45"
    ,"training, wreck, night": "교육, 난파선, 야간"
    ,"Conditions, sightings, observations…": "환경, 관찰한 생물, 특이사항…"
    ,"Groups": "그룹"
    ,"Create dive groups in Settings to organize this logbook.": "설정에서 다이빙 그룹을 만들어 로그북을 정리하세요."
    ,"Delete dive": "다이빙 삭제"
    ,"List of equipment used on this dive": "이번 다이빙에서 사용한 장비 목록"
    ,"+ Add card": "+ 장비 목록 추가"
    ,"Dive computer": "다이빙 컴퓨터"
    ,"Refresh from computer": "다이빙 컴퓨터에서 새로고침"
    ,"Save as Text": "텍스트로 저장"
    ,"Readable dive details and profile samples": "읽기 쉬운 다이빙 정보와 프로필 샘플"
    ,"Save as PDF": "PDF로 저장"
    ,"Formatted dive report with profile graph": "프로필 그래프가 포함된 다이빙 보고서"
    ,"Save as UDDF": "UDDF로 저장"
    ,"Portable XML dive-log exchange format": "호환 가능한 XML 다이빙 로그 교환 형식"
    ,"No equipment added": "추가된 장비가 없습니다"
    ,"Choose equipment list…": "장비 목록 선택…"
    ,"Custom card…": "사용자 지정 목록…"
    ,"Build automatic groups from dive data or make manual collections.": "다이빙 데이터로 자동 그룹을 만들거나 수동 모음을 구성합니다."
    ,"Your dive groups": "내 다이빙 그룹"
    ,"Edit or remove groups. Removing a group never deletes dives.": "그룹을 수정하거나 삭제합니다. 그룹을 삭제해도 다이빙 기록은 삭제되지 않습니다."
    ,"3 GasNx": "3기체 나이트록스"
    ,"OC Tec": "개방식 테크니컬"
    ,"Close group editor": "그룹 편집기 닫기"
    ,"Group match field": "그룹 일치 항목"
    ,"Profile graph layers": "프로필 그래프 표시 항목"
    ,"Choose master equipment list": "기본 장비 목록 선택"
  }));

  const patterns = [
    [/^Choose dives \((\d+) new\)$/, "새 로그 $1개 선택"],
    [/^Found (\d+) new of (\d+) dives$/, "전체 $2개 중 새 로그 $1개 발견"],
    [/^Downloading selected dive (\d+) of (\d+)…$/, "선택한 다이빙 다운로드 중 ($1/$2)…"],
    [/^Downloaded (\d+) selected dives?$/, "선택한 다이빙 $1개 다운로드 완료"],
    [/^Download (\d+) selected dives?$/, "선택한 다이빙 $1개 다운로드"],
    [/^Page (\d+) of (\d+)$/, "$1 / $2 페이지"],
    [/^Page (\d+) of (\d+) · (\d+) dives$/, "$1 / $2 페이지 · 다이빙 $3회"],
    [/^(\d+) dives$/, "다이빙 $1회"],
    [/^(\d+) new$/, "새 로그 $1개"],
    [/^(.+) dive (\d+)$/, "$1 다이빙 $2번"],
    [/^Log fingerprint (.+)$/, "로그 식별값 $1"],
    [/^Synced · (.+)$/, "동기화됨 · $1"],
    [/^Signed in · (.+)$/, "로그인됨 · $1"],
    [/^Sync error · (.+)$/, "동기화 오류 · $1"]
  ];

  function translate(value) {
    const normalized = String(value || "").replace(/\s+/g, " ").trim();
    if (!normalized) return null;
    if (exact.has(normalized)) return exact.get(normalized);
    for (const [pattern, replacement] of patterns) {
      if (pattern.test(normalized)) return normalized.replace(pattern, replacement);
    }
    return null;
  }

  function translateElement(element) {
    if (!(element instanceof Element)) return;
    for (const attribute of ["placeholder", "aria-label", "title"]) {
      if (element.hasAttribute(attribute)) {
        const translated = translate(element.getAttribute(attribute));
        if (translated) element.setAttribute(attribute, translated);
      }
    }
    if (element instanceof HTMLInputElement && element.type === "text") {
      const translated = translate(element.value);
      if (translated) element.value = translated;
    }
  }

  function translateTree(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      const translated = translate(root.nodeValue);
      if (translated) {
        const leading = root.nodeValue.match(/^\s*/)?.[0] || "";
        const trailing = root.nodeValue.match(/\s*$/)?.[0] || "";
        root.nodeValue = leading + translated + trailing;
      }
      return;
    }
    if (!(root instanceof Element || root instanceof Document)) return;
    if (root instanceof Element) translateElement(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateTree);
    if (root.querySelectorAll) root.querySelectorAll("[placeholder],[aria-label],[title]").forEach(translateElement);
  }

  document.documentElement.lang = "ko";
  document.title = "페레그린 로그북";
  translateTree(document);
  new MutationObserver((changes) => {
    for (const change of changes) {
      if (change.type === "characterData") translateTree(change.target);
      change.addedNodes.forEach(translateTree);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
