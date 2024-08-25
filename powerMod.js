const METADATA = {
  website: "https://github.com/RevenMyst/ShapeZMod",
  author: "Reven",
  name: "PowerMod",
  version: "1.2.0",
  id: "reven-power-mod",
  description:
    "You now need to have energy so that the building can process your shape",
  modId: "1945222",
};

/***
 * First we define the global units counter and the map of the energy shapes
 * Then we define a function to update the HUD
 */
let units = 0;
let energyMap = new Map();
energyMap.set("RuRuRuRu", 1);
energyMap.set("RbRbRbRb", 3);
energyMap.set("RbRbRbRb:Sy--Sy--", 24);
energyMap.set("RbRbRbRb:Sy--Sy--:CyCyCyCy", 45);
energyMap.set("RbRbRbRb:Sy--Sy--:--Sw--Sw:CyCyCyCy", 156);

function updateUnits() {
  if (units == 0) {
    document.getElementById("unit-storage").style.color = "red";
  } else {
    document.getElementById("unit-storage").style.color = "white";
  }
  document.getElementById("unit-storage").innerHTML = "<p>" + units + " U</p>";
}

//we define a new processor
shapez.enumItemProcessorTypes.EnergyCollector = "EnergyCollector";

// speed 100 ~= instant
shapez.MOD_ITEM_PROCESSOR_SPEEDS.EnergyCollector = () => 100;

shapez.enumCategories.powerMod = "powerMod";

// only action => increase the units amount by the value of the energy shape
shapez.MOD_ITEM_PROCESSOR_HANDLERS.EnergyCollector = function (payload) {
  if (energyMap.has(payload.items.get(0).definition.cachedHash)) {
    units += energyMap.get(payload.items.get(0).definition.cachedHash);
    updateUnits();
  }
};

class MetaEnergyCollectorBuilding extends shapez.ModMetaBuilding {
  constructor() {
    super("energy_collector");
  }

  getIsUnlocked(root) {
    return true;
  }

  static getAllVariantCombinations() {
    return [
      {
        variant: shapez.defaultBuildingVariant,
        name: "Energy Collector",
        description:
          "Give it the power shapes to gain Units ! (see the mod page on mods.io)",

        regularImageBase64: RESOURCES["energyCollector.png"],
        blueprintImageBase64: RESOURCES["energyCollectorBlueprint.png"],
        tutorialImageBase64: RESOURCES["energyCollector.png"],
      },
    ];
  }

  setupEntityComponents(entity) {
    // add acceptor
    entity.addComponent(
      new shapez.ItemAcceptorComponent({
        slots: [
          {
            pos: new shapez.Vector(0, 0),
            filter: "shape",
            direction: shapez.enumDirection.top,
          },
        ],
      })
    );

    // give it it's processor
    entity.addComponent(
      new shapez.ItemProcessorComponent({
        inputsPerCharge: 1,
        processorType: shapez.enumItemProcessorTypes.EnergyCollector,
      })
    );
  }
}

class Mod extends shapez.Mod {
  init() {
    // the buildings thats needs to use energy
    const ENERGIZED_BUILDINGS = [
      shapez.enumItemProcessorTypes.cutter,
      shapez.enumItemProcessorTypes.cutterQuad,
      shapez.enumItemProcessorTypes.stacker,
      shapez.enumItemProcessorTypes.mixer,
      shapez.enumItemProcessorTypes.painter,
      shapez.enumItemProcessorTypes.painterDouble,
      shapez.enumItemProcessorTypes.painterQuad,
    ];

    for (let i = 0; i < this.modLoader.mods.length; i++) {
      if (this.modLoader.mods[i].metadata.energizedBuildings) {
        for (
          let j = 0;
          j < this.modLoader.mods[i].metadata.energizedBuildings.length;
          j++
        ) {
          ENERGIZED_BUILDINGS.push(
            this.modLoader.mods[i].metadata.energizedBuildings[j]
          );
        }
      }
    }

    // edit item processor : only accept item if enough energy
    this.modInterface.extendClass(
      shapez.ItemProcessorSystem,
      ({ $super, $old }) => ({
        checkRequirements(entity, item, slotIndex) {
          const processorComp = entity.components.ItemProcessor;

          if (ENERGIZED_BUILDINGS.includes(processorComp.type)) {
            if (units <= 0) {
              return false;
            }
          }
          return $old.checkRequirements(entity, item, slotIndex);
        },
      })
    );
    // before processiong : decrease units
    this.modInterface.runBeforeMethod(
      shapez.ItemProcessorSystem,
      "canProcess",
      function (entity) {
        const processorComp = entity.components.ItemProcessor;
        if (ENERGIZED_BUILDINGS.includes(processorComp.type)) {
          if (processorComp.inputCount >= processorComp.inputsPerCharge) {
            units = units - 1;
            updateUnits();
          }
        }
      }
    );

    // store and save data
    this.signals.gameSerialized.add((root, data) => {
      data.modExtraData["energyCollected"] = units;
    });

    this.signals.gameDeserialized.add((root, data) => {
      units = data.modExtraData["energyCollected"];
      if (isNaN(units) || units < 0) {
        units = 0;
      }
      updateUnits();
    });

    //show Units on HUD
    this.signals.stateEntered.add((state) => {
      if (state.key === "InGameState") {
        const text = document.createElement("div");
        text.id = "unit-storage";
        text.innerHTML = "<p>" + units + " U</p>";
        document.body.appendChild(text);
      }
    });

    this.modInterface.registerCss(`
        
            #unit-storage{
                color:white;
                position:absolute;
                top:150px;
                right:20px;
                z-index:200;
                font-size:22px;
            }
        
        `);

    // Register the new building
    this.modInterface.registerNewBuilding({
      metaClass: MetaEnergyCollectorBuilding,
      buildingIconBase64: RESOURCES["energyCollector.png"],
    });

    // Add it to the regular toolbar
    this.modInterface.addNewBuildingToToolbar({
      toolbar: "regular",
      location: "primary",
      metaClass: MetaEnergyCollectorBuilding,
    });
  }
}

const RESOURCES = {
  "energyCollector.png":
    "data:image/png;base64,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",

  "energyCollectorBlueprint.png":
    " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAmsElEQVR4nO2db2xk13nen/ecc++duTPk8M+Qu1yvadqrheis5I3lhRWsFELC2psFBBaCAEH90H4oUiRFYKBAGqRNW6Cp2xRxisAoaiCIgQBtYQQwHBhKVRmqEsWKIKuVLEuWZbXryLK30lor7S6XmiU5M/fPOW8/3Htn7pBDLjmcIYfk+cELmbzDO5ec897znuc+533pt99mRA3gp3/1NKLGKg47TrGMu774CJwiANr8dWwA1hDMcAC4ANTWPzGUmPS/AQghETRJgNb/FowjNQbyqP2+gGGDDcAGQkcorlyrXdBB8y+ZDUwcgdnc+QRDBJGAUA5AAlK53xKu+7WR46XXpYMVEvt9dcOBDYAcbAAdwlu5tvJrUWPtL+NmHWx0cowZAO/vBe4YAoUBACAW8nHpeI/fNuYPRmdG/ki6uG2DwAZAGwZ0iMLt92v/Mbh960smjrM7/msArgCIcv8OCKyYWQAQrM0IG33W6PCf3Wb+f6MnRr+hPDRaSd1Bi+0+cTQDoMuHbWKIlQ/Wfj1aW80G/08AfB9Afa8vr4+E6X9jADeYzRUTx9PR2srfX/lA/rDysdL3hQMwA3GA5P8cMY5eADAjDgBV7FwMMuDrsPk1HQXZnb9j8BMJH4APwNnjK94NEbNZQ/v30MzmfR0FszpsPsYovc8Gv2jWgKuvPIc4aOznte4LRy4A4qCBq688h5P3X0ChAuTy4BETR1nO/xJag4YcIdV90i2cJSFBGySU4YSZwUZDh00YHf8Q4O8jmRGYjX7PxNHvsMHfNFfx/tWXn+Nm7daBW+T3gyMXAMwGzdotXH05FwQEgCFMHKaLXbyXvJoc6bgPq0JpjoQAiAyAdwGs7dsvsE0IKIHVnFAO4ubaL+sorAD81wDAzCsmDlW4CvcX3/8b2azdio/i4AeOYAAAG4NAuSATo5Tc/RlIF7pE5AvHywb/cwCu4SCtCYh8EmJGON4FE0efZOYRAMsAR3HQ+L9Lb7/FwWpNMZt4vy91vziSAQC0g+Dnf/sUiIQiqX63VD0JkupDtAe5nw7+VSR3/gOkAAEA6iB6l4RYBVAGUAJQA2BMHP1k9drPaiYOw61Pcbg50kows0HcrCNqrMZxs/6V9EHvux2vMTpTRw7S4rcNs8OmI72h9N9xo+MRHFkBNOFIB8A66kI5SIMgG+xR8gQYZSQK0MGD4Zs4KqdfZTMYEYkIRAfzd+oje50CERGRUF4VBG+P33srhFTuLAkB1rqGJAAiZlM3UbhsVDguHffzIPorHKQ0iNkxcfh5k0i7y8grW44bSLdwgYR4Hclzgv2FEZs4uM7JanzPZqWBBgARCaHcSTB7zDAgQCrv45Onz/5v4biDfOudwwwdReBm/QvM/M30u3Vm86wOG08IIU+SUncD+PF+XuZOYK1PxWHjZKrwPIs0AIiopLziF6buPvcFEH5rXy8SAMAwUYilt3/0pzoO/hCMgAgEImPi8AYz60G980ACIB34VSGdT03c9Zn/pYMAyQMmBhEhajRAzeYg3npXkGql+fl8v8ZavxWHzTOOKJ2HoPeQLCSHG8OVOGwusNYA8BY6r9kxcQwdNodmBcBsUD7+id9k5t8kIkjHhXQ93Hrnza8ZHX7FxNG1QQRC3wOAiKR0/c+MfeLTr+koRNxM/sgknbcozaOZzRIz6oN4/13gUmTuTe+WHVIns3ndRMEJLdW4dL2LIHp6/WuGCmZfR8HFXOrzeudhUzdxeD195nENw/FcIybpFAmoAgAbrMVB8EvlmU99STrOl2rv/uQ/GB3/iYmDvgYC9Ws/ABEJks6kkGq2PP2JV6VXBDP/HZKHSnUANzH0+TNXkNz9b3Y5WBFSPaEKZQjHeQvA9/b22raPiaIH4ubaGaMjAPgmus9YfrrgH9ZAdgBUAIwSaJxZf87xS7j1zpv/KW6u/U6/nl305Q5MREJ6/i9XPn73D0wUg4QAM18H8AqG9w/cBUoHSte8oGa0fkGHjQUS4gxJ+R7WSabDABs9q8PGGaNjAHgBXQf/UA/8jAjJjegmgx2Q+D86CP/h6MdO/9Pa1Z/c0EH9K8y86yDYdQBkg3/0Y3f9IEl15FtI7vrXsO6OT0Q+iKoAHAI5/Xj/fsPJ4I/BXGc2N9ExUPiyiaNZHTbnVMG/BKJvYJgGErOvw+CSiSMAfAXA5fZBAgkxi+TOr4bN0cTgGEAE5oiZ1/3dExu6Mfo5ItKjJ079+9vvvxPqoP7V3QbBrgYgEQlVKH9u9GN3vQIQmPnrSKatjrsOCTFLQs5Lx52TXhFCKtAQ78bIHpDFzTqMjl8F+E2kwcxsXtRRMEdSQTruQ0MjjTJg4uhBHTYzU9uL7YMEoZwHvJGxM0IO5/M8ZgOjY+igCRMFMEZfgeHLDM7fSN9hZp+E+q+jH7vrj1Z+8Y6Ig7U/3k0Q7CoAhHKnxud+6RUdx2Bjvolkkdsa/ImXxn3ELY+NeyMVSDdxXxIw3LtrGTB6FM2PVtGs3Tyno/A4wNlAr7PRT+mgsThM0ijreD4O6nOpm/UZ5O6g0nEueqPVueLECITct0vcGk4Sz3RXHsKV2lywWpszUbDKzE+i/fvUmdknUv9l7BOf/sNbP/vRGzoKnun1bXcRACRIyNm42UD6V/WRpD0AACHkrOOPXCpOTkN5QG4z9nUANwA00N6wMWy4UuDe4kTZI6XQWPrgpI6CLwL4Tnr8Ghv9Rhw2zw6FNLpR8mytTYR07ilUpuaKE2WI5NO+DuCn+3KdW+MSUITElFCYVoUK3JEKGrdulKO12//AGP0cgHfS19aZzWQchj8iIR8B6K+B3maBngNAKKc6cuLUK+ng/zZyyokQ8pQ3On6hODmR3PWTgf8GgDcxTDnzVhDeFAqf90YKZ6J6CUbHJ9noGaRBzmzeNFEwu+/S6BaSJwk5owr++cJYa/APtXqVQQSfJOYdH+ekM4X6koPg9q0LRscO2uuaJRKqMDLzyS/Vrr79FyYO/7aX9+oxESchpPOJ1CT2Q+QGPwkx45YrF/xqa/AbAN8A8DIOyuBPiAB8TyhcLY5PQXlFEIlFtD1B2VNimDgeB/DZ/bhIE8ef1WFjfOPTXlGRbmGxNHUcIkn7AxyAwZ9SB/AaEb4hHaz61TG4I2MQQi4AOJV73VWAnhdS/RpAPd3MewoAoZyJ0ZN3vULJgup29n0COdItLBYnqxAOQIRlAH+OgzXwOyDC804RKE4cS0qMAA/lDmfSKFjrMwBm9/LaWGeSpwY6JE+CcLxHSlMnoAqtGfjJvby2PlEH4VtS4bo/MQHpFUFEF9C+CRFJx4ycOPV7Qjrne3mD3mYAhpvmmy8hJ7WRlKeKY9Uk50/+6MP9xHR71EngKbek4I1OgIQ8CWCmfZgvmzi6ktgK+BL2yjXK7Ouw2VXyFFLdVxgdLzu+yLZ8PoWDYN/oTgTC09IFCmNVUJJyz+eOvw3m/wHgWC8n33kAEAnhuB9Lv2p92ARypOMtuOVC9kfvUCIOONeEwhuFsVEotwCAFpHzC6XSKHQUAswPYdB7BxjQUfRQbgN/S/IkIWecYvlcYayl+LyEnDhxQIlI4Cm37EK6BRDROXTeaEaE45ztJQ3acQBI5UyOz336FSFdIJf+QNCMU2r90bMdVIeJl6UL41dPQCZO1i/mjmXSKFjrkwDuHuSFsI7v0WH9ZCp5PoVc3q+84qJfnc7y/lUMgUTbJ64JietOaSRLL6rp90lIR4zNfvpfCeU8vNOT9pICucwACD9H7s5CJKrKy+wl+FEP5x16iPAtpyTgVSYhpDqJzqk4k0YBw+eRPBDsP4nkeT4neaafAUE43qP+5PF83v/0QK5hvyC86RRK2UPUXBpKV8DmL6iHNGjHAcDJE0cw8/qcsiJdlQXA7Y0/eSioCYlXi2MjUMUyiMQCcgM9lUaXdRQAzBfR7/XAFpKnkOp+b3Tcc3x5GPL+zagJV2TRPZl9k8HQcVzkHp4r9TIDcLrH9Bryf2CiSs7dcFhy/268JhyslqrHIF0PROJxrJdGg8FIo5tKnkLOuuXK2eLYSKb3v4GDn/dvgIBIZE6CZIN/Rp2NLoJ3bknZjSFn/UJvOE0mA4AIT6sCUJr+OITjCYAezx2uGaNfiPssjW4meRIJX3nFS8Xxybze/3I/3nPooI4b6/rxNoJ2OfhtM7yOtOGmRgJPOT6hUJmEdBwPwMX2Yb7M/ZRGt5A8Sch7vZFxSO9A6/39Ysf722wA9M41EnjJLZWgkoXZHDrXA/2RRpkdHYXdJU8SvnS9s8L1ssH/Kg5f3j9QbADsAiL8THqAW65AOB6IxKPIrwf6II2y1nfroLFB8gQAEuJTqliGU2wtfA9d3j9o+hYAw+xuHiB1EnjVKXpwiiWAyEOHPLdLaTSTPJPB37GwJSFnVLF8vjhWgWy7PG0A7JC+BcCQFBfYc4hwWbpI1gJuAUTiAvohjW6UPN9sv6fwlVtY9CePQbrI7j6HS/PfI2wKtHvqJPCUKgLF8SkIxwNAj6Kd8/ckjW4meQIASfnZwvhU8sCrrfnv/660A4gNgP5wTUi84I14KIxOQCjlAfh87njNmPiFOKxn0uipTc4DIClo1d3lmXp9/JEzju9BJJ/eYfD67Bs2APrHZaHwRmG8jMLoJEjIM+hcD1zmOL6iwwbYmAvrjrVgY2Z02LjQVfIk4bvlymJ5eipLfQyAnwzuVzr82ADoLy8LhStepQKhXAB0MX+Q2byow8DosAk2ZhHMaZUGAMw+GzOrw+aiDoPscXvnxnbHfTRJswAirCLZa2FTn10wdGVJDjgOEb6rPPyj4sQ06jeveSYOHwbw3fR4ndk8qYPGYyaOIB3vEkkZALjBWk/pKPBYt7pTPolc3i+U83Bx4lh53QaXw2w52ROsDNo/HKT1a0jgmcJoAYXENXoana7Rm8zmGyaO3oqba4jWbnvR2u2TcXPNS5txv41kC2l7j7VU84XK5OnCaCGzm78AO/j7Qt9mgKMqg+bIpyLvCoU3iuOjZ3UUIFytLbDRNbQXq3WAv8fMP0YSOK3gwYaaSnLG8UcWiuOjeaPbZVj6gk2BBsfL0sFsaWpqnLVB3FxdNFq/BHB+g8oWtgWCkPIeVSidL01PI61ntYzDanTbJ+wieJAQnpQuMDJzDF6lCuk454nEHR+GEQlfOs5FrzJ5vnz8eP5h15ODv+ijRXsGoKx1VG/JjF0DdCVKS3s8XqpWPKdYQrCyPBc3VufYmOvM/C6yOphEPhFVSYhZVShPe6PjcEsqKygWAPgWrOKzNT0MQpX9oPLSmxJvGQAkpCqlzaI7a+jv/L2PCnUQ/jwpsqXOuKUp6HAKcRBMx436tA6TRiHS9aAKPlSh0C4hmczPbyHZ+WUXvVtARE1V8APW7o7u4ioZ/MAnFx66w9hPXm9i/PPlK+9CB8EjDP5vsHel7RAB+B4J/IwE5knitCp44FGv/VFRexJOZc4rSPw/9invNlAFf+STv/prx4WCAm1/TCogudOowrZeH+sIfwSiXwcg0VYvLNvjGoBrRHgZhGraDaWK5HOIkdbDT//ZO/72cUBiQhXgSHdnDf9ya4BtvZ5hP5h+UEdSNqbn0jHM8NOZwn4eCcVW59EdrAWsDHoAYYPZuIlLqggQbdoC6Siy42WwlUEPGMzw4yYuhasrSBwTWztLLVtjrRAHDBPh0cbyEpLaZACA4r5e0BCwm7Fnd4QdIEyM+xofrZSjxiqkcrJP/sinP7sZe3YNcEBgg5lwTZ8LaktgYyDdwmGvwrcn2DXAQYDhxAEWG7c+hIkjkBAv5DrvHPkZYDfYADgA6BhfbNxaQhw0AABCuQvpU2IDGwC7wgbAkGM05oNa42S4WkNSHoW+KV0vS38OWwn6PccGwBDDBtWozguNj24g7fz+KhHNyHYlOHv33yVWBh1idIjHGksfwEQBkOwFeA1EFem2fCs2AGBl0EOJifFAY/kjxEEDnLgUn00P5fsw2ADA7saeTYGGEKMxH9wOzgQry1nqk9YGIoekmhXKKkD9wgbAkMGMStzEQmP5OpLaQHgL6R5gIvjS9UQ6+JdhjXC7xgbAkGEiPNpY+hDpRhmDfHNroopyC9nd/2bXE1h2hA2AIcLEuK+xfNuLGmtZ3v+t/HECjeYk0Bv7cImHDhsAQwIbzIar8bng9q11eX8OoilrgegvNgCGgMzi3Lj1IUwUAcl2yA21f0iIqrVA9BcbAEOAiXGxfusm4rABTkS9765/DRH5Qrnj1gLRX2wA7DNG457mR2vT0dptpO1nN6n1TxVrgeg/NgD2ETaYiep8vlm7meX9m9b6p/QJsE1/+ou1QuwXDEeHWKwvfQAThUDS4+vHm76e0hkgwQZADmuFOIAYjQcbt25BB/VM8tyQ93dANGktEN2xVogDhtGYb95ung5WPkK3NkgbIYeEPGktEP3HBsAew4xK3MBCc/l6y+KMO5Q7J4Kv2hZoa4HoIzYA9hgd4vH60ofQYQAkcuZrd/yhzgWwtUD0Ebspfg8xMe5vLtdE3OxudRBSzYNRMSauId8cDzQqrAViINgZYI8wGvPBani2uYnVQQg5K93CAoNPYX3/AKIpZS0QA8HKoHsAM3zdxELj1nVwHAM5izPQ0vgvkZAAcxkb2iRZC8RWWBl0yDERHqnfug4dNjOrw+vZMQI5QrkPCMcFs3ku/Uu2G2NbC8QdsTLoEJNYHVbHo/pq3urQUnFIynulVzxJJMDGPLjxDNYCMUhsAAwQNpiJ1sz5Zm0pn/e3rA4kxIz0/HNCSgB4ho321p/DWiAGiw2AQZFWc6svfQAThwBwFZ15vy+dwqJUDgBxlYFa0iSbV5HX+a0FYqDYABgQOsbDWTW3VPJ8Pn9cKOfBJLUhAPw8mKtpivQOOgPAWiAGiA2AAZBUdWjMtau54RnkBrWQ6h7pFucoafv+DIA6Gz2bLudybtDEAiEdqwANCiuD9hk2qMYNLDSWb+StDq3Fa5rTnxdSAaA3AHoXzH4SAADyC+SkCkT25XVYC0RXdjP2+vYk2MqgCTrCY/V2NbdV5KwOROQLx7soHQ8gWgb4zfSQn1sAtzfDdFaBsHf/TbAy6JCQVHOrIW62LM5P54+TVPcrtziejuhnkbujs9Eb2tTaKhCDxwZAnzAa88FKeGazqg5CyFPK809TInk+lz/GYIe1BsBX0bkAtlUgBkzfUqCjvAZIqzrkrQ5vYL3VwSteSPP+t5EoPW0MT6Yzxk+QS4GsBWJ72DXAPpNUc+uwOqzP+x8WSd6/CvDLnT/NvjHxp60FonfsGmAfSau5laPGKjjpW/ptdNzF1b3KLUxTcht/GuuVHIbDRo9vODFR1VogBo/dD7ALksZ1G6q5tTaskJCzyiuepST1eQld7+LspA/AOkgWwFYBGjR2BugVht9qXNelmhsR+dL1LgnlAKArSPL7LqeBs4kFomQtEIPHzgA9omM81Fi6mVgdNlRzI0co90HpFDKrw4voWuwKALOfpk7WArEP2BmgB1qN6zap5iakvFt6hTkSIju26RNcNno2fQCwwQJhq0AMHiuD7pBujeuQtziTqEq3eF4IBYA6jnU52aYWCOV6SBUgWwXiDlgZdA/p2rguhYh84bqPSMcFiK4DvGW5EwA+m7irBUK6heyDfb+f138YsTLoHpFYHZbzFucOq4OQzv3KLXrdrA6bwcZk52qxrgqETX8GiF0Eb5N247qP8pJn2+Is1Lz0iqdJKCCxOtx58LcsELiK/EAnmhLSAZukkBaAB/r6y6yDAEBgiQjv4oilWzYAtsFWjeuAzOpQWEisDngL660Om2F0ZoH4Wcf7GV0PaksIVyUAOtOf36I7RAApB8WxEQgHq0R4EkcoCGwAbAMT4dH6Jo3rulicX9/0RB2wb4zeYIEAAGa+HK7VzgI0cHVBSAfFiWmkipMz2HcbPmwA3IGscV28WeM6qT6r3EJXi/OWMBw2JrNArH9GUGPmbwBcAcMHBjMwhVR1b2TsUmG0mClO27/+Q4KVQbeANU5t1biOhJxVbvFManW4Q4XnDWd30u2Sm1HHAAejEHLWLY1eKk5UIJLwehtbSbZDjJVBBwAnVocLW1sdCqnVAVe2IXl2nr/TAtH9KfGAICFmVLF8ya9Ws8G/ijv1JxhidjP2bAq0CSbCxfqtG10b16XV3B5qV3XAizt+A2YfDBDRZSQpTrVPlw5m3nT2IKKK8vzF0tQx5PYaPNmv9z5o2ADogtG4p1lbm47WVrpaHdrV3GR2bMepChFFslAEmM8BONefK2ewMdBhEDCbp7GulDqBHOkWnihVZ6AKyPL+b+OI5f15bACs406N64hEVXrFrJrb1laHrSBRk457FYwp9GmRy2yiOKg7ADvdzikc9xF/cgaOT9ngfwpHvN+ADYA8GxvXLSPXuC61OD8qlQuAru40719HDaDnkUiPuw6AZPA3njBRCGa+jnULcqGcB4oTx6bdEYVk4sJzOKCL3n5iAyCHidPGdZtUdUiquRVEmjg/j92nDv1JPZh9E4WPp4N/FevkTCHVfKEyeaZQKSCpxYUXsN2HdYccGwApRmO+uZI2rkvkyQ47A5GYkW5xjkgA4KfAfVi4EiJA1LEbFYiNr6PwYhw0vHRfQefgF/KUOzK2UJwYReLS6Nywf9SxAYBNG9e17pDJBnXnXjYams0VAA+D2d/kdEDeZMick+lygh0DQikI5bwN0OYbZu6AiaMHdVCfzpVgzG3JFDOOP3LBn5xA4tLAdQAvdz3REcUGAO7cuI6ZYeIwq/I815c3JQLJMsCogOCjB9eniaP746A+l5ux2iUYhZhRhdKiX52GdJE9LXq664mOMEc+AEyMB7ZqXJdSZ+YXsZ2OjtuESPhCqUsg6ikFYq3n46BxNqdUdcxY0i0stuTOZPB/s5f3OewcaStEUs0tOrNZ47p19M2aQEQVoZz7CQSALu/0vGz0bBzUF7jtTP1x7rAjHe/RUnUGjo+83Hlo9xVYK0QPMMPXARYayx/CdGlcN2AcIVVqhOMdDn4zGwf1SyYOwUkpxQ73qXTcB4sT02WnJPOD/1DLndYK0QMmxsX6rZvQYTNNEejH6FnVoUTLX6fps+EawDexIfUgRygntU/v4O7PXNFR85KJAjDzMtZJsYncWT3tjXbInYd68O+WIxkAbFCN1qJpE4dIffwA8ASBWgkziNpTKxEAygIlnXMp/V/uZ1qvSRbOUX0FOorezpdFIZAvlHN/IqfSa9i2fdpUdBRc1GEzW6ts0Pq90YmFwng5kztfhZU778iRDAASgDfqwC2f6OGHt/cyHQJRYxVIGl+3zXIERyhnOv1qm3k5OzoOH9BBYzznTcrZssWMUxpd8CfHIJP55yr6uGA/zBzJAABwkwSeIoF5JGlPlrZE6b9wi5+NN/l+luaEbNDQYXwu3e+7TuUhv53+bC//N3H0eR00Tpq21t/RadIplhdz1uYAwHe2c17L0Q0AIBlEA8mPmXFftLaCXMU3AJmNWn02SX+wrfTH6PieOKifyalUHe2WlFdc9KvHodrW5m4yrmUTjrQMOihY496osQoYBvKVnQm+UO7J9Is7pj9s4lM6aJw3XXoOAORI13vcr56AU+yQO4+ctdnKoENEUkHCeCaOso00uYFOvkhaPq7eKf1J5M7GheTpM1/BupxeOu4Xi5PHxTpr85FUfGxhrGHC4ONhvZX+vIG8UqPUvWm90C3TH2au6LCRyZ3XkSyic7VH1X3F8amT3ohr5c5dcpTXAAPBaHwmrq9k6U9uIw1VhHTn0q8234TCpmKi4BEdBuAkir6Ljdbmc4WKnx/8Vu7sETsD9JFkIz2XdRRm6U++4rMvlAJIGGx69ze+jsOHddAopzPI01gnd7rlysK6Sg528O8COwP0E4PZqDP9ye8jnk86w/OL2CQATBzdr5uN6U3lTn9k0Z+cPBSVHIYFOwP0EWNwb1Rfxfp6/4n5zT2dftk1/TE6ui9u1k8b003uFFXl+Yulqq3k0G+sDNonUnPdeM6qkBvo5EjlZFrlBksy63heB41zuc047fpDIF+63mO2ksPmWBl0GDCYDdduZ+nPW8hvpxTyVLJi5Q2N8lJ350JafOttrJM7hete9KszcEq2ksNmWBl0CDAG87n0573s+0nxXOdsepf6IP8zzKaaszZv2K4olPNAcfzYtFtW2eDvWBdYdo8NgD6Qpj/TOtHtgc47tC/aPoV67od8EwaP7rCSg+0X3GfsGqAfMGai+iqQODXfRmf6M5uoP9R+KJZVcgibIid3djTb8Gwlh21j1wD7jNG4Oyd/rq8mcS75gLh19+5SyWGdtbm8ULSVHLaNXQPsI8zwdYiT3dWfjvSnBty5koNjKznsKTYAdgtjJqqvZUV0r6Az/Tme9g54C6A663jLSg7KLSz6UzNQrU1qtpLDoLEBsEvY4NQW6c+vpPnpz9jEp+KgsWC6V3KAdLpamw9tJYdhwQbALkjTn7lc+pOXKH2hXAFKmt7lrM1XAbySP4903IvFyWOeUxJH3tq819gA2A2MalRvINfqNFdLVFZJSjDzCzpqPr6ukkPe2nxPYaw654161tq8D1gZdBewwcfDeuvpb6vVKRFVSKn7wYCJwxkdNsUmlRzu8UYnzhfGytngfwlW7twxuxl7fZsBjpoMygxfRzijg67pjyOU4xkdXdFB43S6QO4id46ez1VyuIJ16wLL9rCFsfaDVvoTA0kjjVynd1EBM3TYnMlZmzvlzmJ5sdRZyeHZPbx6S4pdA/QIM2ZylR/ezB8joooOm8tGxx66VnLwF/3q8by12VZy2CfsDNALDEdHOBuHjSz96fDoGB3X0++9iU5rsyPdwuN+debIV3IYFmwA9AAzZuJ6E5yUK1nFxgHcdSGbNKk7LlxbyWFosClQDzBjJmynP9sqQSiUc39xYnraHXGyJnVW7hwC+hYAR0YGZTgmwtk46J7+dENIdU+hMnG2UCnaSg4DwMqgewgzZqJGmKk/Ae6Qv5MQs265cr44XsmszXvZh+BIYN2gewgzZqL6ClIr8w+2ei0JMeP6I5f86mSm9S8D+N7gr9KyXWwA7BAT42zUaPUT+2Cz1xGJqir4i371WDL4rbV5KLEBsAPYYDZuRFn6Y7DJ5vS0Sd1jpeoJW8lhyLEBsAOYUc1VfthU/RGO94hfPb6+SZ2t5DCE2ADYARzjXNxsbX7pOqCFch4oTkyP5yo5WK1/iLEBsE3YYCZqxllHSaCL/Nmq5GCb1B0YbABsk8T700p/3lh/XEg1742M20oOBwwbANuENe6LGq30p+OunhauXShOjttKDgcMGwDbgBnVqKlFup8X6GJt9qtTWSUHAyt3HhisFWIbsMHxaG0lK3vYSn+IqKLctEmd12FttpUc9hBrhRgwrPG5qLHakf4QyJGO90gXa7Ot5LDHWCvEAEm7vnhmXdcXkTSpK9tKDgcbGwB3wmB2nfoTpZUcTnqjtkndQccGwB0wJu35m258F1LNe5XJ84Wxkq3kcAiwAbAF7a4vSdlzEqLmlEYX/ImKreRwSLABsBW5ri8kxHNOceQJW8nhcGELY21B1vSOQJBe8UJp6pit5DCEWBl0AGTpj4lDCMd91e9sUmcrOQwRtjDWIEi7vpBU8CeOnbOVHA4ndg2wCWwwG4dNFMaqJlfJ4TnYwX+osAHQBWb4RuO0UyyjMFoQOa3/na1/0nLQ6CkFoq7LDk6l8kOBTwQUxlq+fmttHgYYzmZjjEBF9LAc2PkMQABJlS29ndzFrZn4cEQAEerCwbKQCJA86LLW5iGAAcfEyAoStAyHROSTUmUAeqeS0I5nAAJYui7ihgCzriAzfzHXdNA4iZIPEPydnnfIqBO1LM1W7RkWGJU4aGb3+Y5mhNJxQYQGdjgL9DIDRE6xlM0A1da1sVlK6uUAAOZ3fN7how47+IcKNphP+rFpICdGEImy45cBwoc7PeeOA0BILPkT3j9Juh/i7tbFMb8bBw3ETYAZc8CBnwUsQ0TiysVc3K7JlG1KYlJq1p8s/JmQeH6n5+1lBtAk8axUDgg0gvZAr5s4utKsLcEk+8Yf3PG5LZZNYI3PBrVbSFvMXkc6OxPIF1LeJSReAyHY6Xl7kkFJoF6oTICEAIDZ1kUyvxiu1hDcbsJozOFwpEKWfcZozAcrwZlgtZZtSmqJEiTEMW9kHCRwDXuiAgEQCjf9auG3pOsBwELuUN3o+I3G8nWEKzGMxgKA+3p5D4sFAIzGPeGaXmgsfYhcj+Us/2fhOJ8rT5f+VEg808v5e30QpoXCfy+OVyGStcD9uWMvmzBYXrv5CzQ/akBHOMeMi7BrAssOSJsQXgxqwfm167+AjgIgceC2igsLqX6pOF6dFA7+CoRmL+/TsxdIKHzgTxV+I6yPfD1YqZ1lY95FGpkMftqE4cX6zWvTcWMUhbHqnCpgjgSugHAZQJ0SHdduHrcASDR+AA4YPhvMxwHmmh8tIVytgY0GM68CeDJ7PQkx7ZTKv1qa8r8qFJ5Gj544+u2f9v7wig1kHOBfLv/82pej+hqYzbfR1mcdAPcS0TkhFVShBKc0AuUWIBw6nP5pS+8wYGIgDhqI6iuIG3UYHee3or6JbOFLVHaKpcfGP3XiPysPv0+id7l6VwEAAGyg4ia+vPzz938vLRv+TXRWRqgAuI+IThOJxExP3c0UlqMLA8m2U2Ywm0zqvIKkCHHroVc6+P/e+CdP/Ikq4N+SwNpu3nfXAQC0guAPlq9c+92ovgpmzs8EGT4SxWgSSVCUkLdSWCzJHf4GgCUkOn/Hnb115//kia+pAn5/t4Mf6FMAAGkQBPh3tfdu/ItwdQWs9Q8Z/GPYp6mWXUKgIkl52i2Vf6UyO/3HysO/6cfgB/oYAEASBDrC763daH65uXwTyWZy8zwzvweg0bc3shwFmIiKROK4cN1fKY5VR0tTxa9KF/96Nzn/evoaAAAAhjQa95kYv7F2o/GPg9vL0HEE1vojZvN3YF4CowawVYAsOQggOCAaJaIJkmpKKOdUYXQMpar/deHgO0Lif/Yqd276rn0PgAyGMhq/zAZ3s8YT9VvBYtRYS2YFrbPVvcUCACAikFSQrgenWEJxwvszIfEDEnhPSPx1anPo+2AdXADk3iOdFe4F4+PMGAVQQPIMwopBlgwGEBOhCcIHQuJFEEIkvdgGxl5simcQYqHwOoDX0+/ZgW/ZjD3dVbVfVSEOx9Yxy4HHboq3HGlsAFiONDYALEea/w8RW2CyIHfekgAAAABJRU5ErkJggg==",
};
